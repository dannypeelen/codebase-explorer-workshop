"""
Pass 1 of code extraction: per-file syntactic indexing with tree-sitter.
Unmodified from the original AI Codebase Explorer project's
extraction/code/python_indexer.py — included here so you can see and run
the real thing, not a simplified reimplementation.

Deliberately does not resolve anything cross-file — it only records what a
single file's syntax says (imports, defs, calls, bases) plus exact line
spans for evidence. Cross-file resolution (import targets, call targets,
base classes) is a second pass (`resolve.py` in the original project) not
included here — see docs/extraction-pipeline.md for why, and for how the
full `data/flask_graph.json` this workshop ships was actually produced
(this pass, plus git history, GitHub, and Gemini rationale/embedding
passes, none of which are in this trimmed-down repo).

Tree-sitter recovers from syntax errors instead of raising, so a single bad
file degrades (recorded in `FileIndex.parse_errors`) rather than aborting
the whole extraction run.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import tree_sitter_python as tspython
from tree_sitter import Language, Node, Parser

_LANGUAGE = Language(tspython.language())


@dataclass
class RawImport:
    kind: str  # "import" | "from"
    module: str | None  # dotted path as written, e.g. "os.path", ".pkg", "..pkg2"
    level: int  # count of leading dots for relative imports, 0 for absolute
    imported_name: str | None  # the specific name after `import`, "*" for wildcard, None for plain `import module`
    local_name: str  # the name actually bound in this file's scope (alias if present)
    line: int


@dataclass
class RawClass:
    qualified_name: str
    name: str
    bases: list[str]
    decorators: list[str]
    line_start: int
    line_end: int


@dataclass
class RawFunction:
    qualified_name: str
    name: str
    is_method: bool
    decorators: list[str]
    line_start: int
    line_end: int


@dataclass
class RawCall:
    caller_qualified_name: str  # "<module>" for module-level code
    caller_kind: str  # MODULE | CLASS | FUNCTION | METHOD
    callee_kind: str  # "name" | "attribute" | "other"
    name_text: str | None  # for callee_kind == "name"
    object_text: str | None  # for callee_kind == "attribute": text left of the final '.'
    attribute_name: str | None  # for callee_kind == "attribute": the final identifier
    line: int


@dataclass
class FileIndex:
    path: str  # repo-relative, forward-slash
    imports: list[RawImport] = field(default_factory=list)
    classes: list[RawClass] = field(default_factory=list)
    functions: list[RawFunction] = field(default_factory=list)
    calls: list[RawCall] = field(default_factory=list)
    exports: list[str] | None = None  # from `__all__`, only if it's a literal list/tuple of strings
    parse_errors: list[str] = field(default_factory=list)


class _Ctx:
    __slots__ = ("scope_names", "scope_kinds", "caller_qname", "caller_kind")

    def __init__(self, scope_names, scope_kinds, caller_qname, caller_kind):
        self.scope_names = scope_names
        self.scope_kinds = scope_kinds
        self.caller_qname = caller_qname
        self.caller_kind = caller_kind


def index_source(source: bytes, repo_relative_path: str) -> FileIndex:
    parser = Parser(_LANGUAGE)
    tree = parser.parse(source)
    idx = FileIndex(path=repo_relative_path)

    if tree.root_node.has_error:
        idx.parse_errors.append(f"{repo_relative_path}: syntax error recovered by tree-sitter (partial parse)")

    root_ctx = _Ctx([], [], "<module>", "MODULE")
    _visit_children(tree.root_node, source, idx, root_ctx, at_module_top=True)
    return idx


def index_file(abs_path: str, repo_relative_path: str) -> FileIndex:
    with open(abs_path, "rb") as f:
        source = f.read()
    return index_source(source, repo_relative_path)


def _text(node: Node, source: bytes) -> str:
    return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _visit_children(node: Node, source: bytes, idx: FileIndex, ctx: _Ctx, at_module_top: bool = False) -> None:
    for child in node.children:
        _visit(child, source, idx, ctx, at_module_top)


def _visit(node: Node, source: bytes, idx: FileIndex, ctx: _Ctx, at_module_top: bool) -> None:
    t = node.type

    if t == "import_statement":
        _handle_import_statement(node, source, idx)
        return

    if t == "import_from_statement":
        _handle_import_from_statement(node, source, idx)
        return

    if t == "decorated_definition":
        decorators = [_decorator_text(c, source) for c in node.children if c.type == "decorator"]
        inner = node.child_by_field_name("definition")
        if inner is not None:
            _visit_definition(inner, source, idx, ctx, decorators)
        return

    if t in ("class_definition", "function_definition"):
        _visit_definition(node, source, idx, ctx, [])
        return

    if t == "call":
        _record_call(node, source, idx, ctx)
        _visit_children(node, source, idx, ctx)  # descend into arguments for nested calls
        return

    if t == "assignment" and at_module_top:
        left = node.child_by_field_name("left")
        if left is not None and left.type == "identifier" and _text(left, source) == "__all__":
            idx.exports = _parse_string_list(node.child_by_field_name("right"), source)
            return
        _visit_children(node, source, idx, ctx)
        return

    # Transparent containers (expression_statement, if/for/try/with blocks at
    # module level, etc.) don't change scope — propagate at_module_top as-is.
    # function_definition/class_definition bodies are handled explicitly
    # above and never reach here, so this never leaks top-level status into
    # a nested scope.
    _visit_children(node, source, idx, ctx, at_module_top=at_module_top)


def _visit_definition(node: Node, source: bytes, idx: FileIndex, ctx: _Ctx, decorators: list[str]) -> None:
    name_node = node.child_by_field_name("name")
    if name_node is None:
        return
    name = _text(name_node, source)
    qualified_name = ".".join([*ctx.scope_names, name])
    line_start = node.start_point.row + 1
    line_end = node.end_point.row + 1

    if node.type == "class_definition":
        bases = _extract_bases(node, source)
        idx.classes.append(
            RawClass(qualified_name=qualified_name, name=name, bases=bases, decorators=decorators,
                      line_start=line_start, line_end=line_end)
        )
        child_ctx = _Ctx([*ctx.scope_names, name], [*ctx.scope_kinds, "class"], qualified_name, "CLASS")
        body = node.child_by_field_name("body")
        if body is not None:
            _visit_children(body, source, idx, child_ctx)
        return

    # function_definition
    is_method = bool(ctx.scope_kinds) and ctx.scope_kinds[-1] == "class"
    idx.functions.append(
        RawFunction(qualified_name=qualified_name, name=name, is_method=is_method, decorators=decorators,
                    line_start=line_start, line_end=line_end)
    )
    caller_kind = "METHOD" if is_method else "FUNCTION"
    child_ctx = _Ctx([*ctx.scope_names, name], [*ctx.scope_kinds, "function"], qualified_name, caller_kind)
    body = node.child_by_field_name("body")
    if body is not None:
        _visit_children(body, source, idx, child_ctx)


def _decorator_text(node: Node, source: bytes) -> str:
    # strip leading '@'
    return _text(node, source).lstrip("@").strip()


def _extract_bases(class_node: Node, source: bytes) -> list[str]:
    bases: list[str] = []
    arglist = class_node.child_by_field_name("superclasses")
    if arglist is None:
        return bases
    for child in arglist.children:
        if child.type in ("identifier", "attribute"):
            bases.append(_text(child, source))
        # keyword_argument (e.g. metaclass=X) and **kwargs are intentionally skipped —
        # not a base class relationship.
    return bases


def _record_call(call_node: Node, source: bytes, idx: FileIndex, ctx: _Ctx) -> None:
    fn = call_node.child_by_field_name("function")
    if fn is None:
        return
    line = call_node.start_point.row + 1

    if fn.type == "identifier":
        idx.calls.append(
            RawCall(caller_qualified_name=ctx.caller_qname, caller_kind=ctx.caller_kind,
                     callee_kind="name", name_text=_text(fn, source), object_text=None,
                     attribute_name=None, line=line)
        )
        return

    if fn.type == "attribute":
        obj = fn.child_by_field_name("object")
        attr = fn.child_by_field_name("attribute")
        if obj is not None and attr is not None and obj.type in ("identifier", "attribute"):
            idx.calls.append(
                RawCall(caller_qualified_name=ctx.caller_qname, caller_kind=ctx.caller_kind,
                         callee_kind="attribute", name_text=None, object_text=_text(obj, source),
                         attribute_name=_text(attr, source), line=line)
            )
            return

    # dynamic receiver (call result, subscript, etc.) — not reliably resolvable.
    idx.calls.append(
        RawCall(caller_qualified_name=ctx.caller_qname, caller_kind=ctx.caller_kind,
                 callee_kind="other", name_text=_text(fn, source)[:80], object_text=None,
                 attribute_name=None, line=line)
    )


def _handle_import_statement(node: Node, source: bytes, idx: FileIndex) -> None:
    line = node.start_point.row + 1
    for i, child in enumerate(node.children):
        if node.field_name_for_child(i) != "name":
            continue
        if child.type == "dotted_name":
            module = _text(child, source)
            idx.imports.append(
                RawImport(kind="import", module=module, level=0, imported_name=None,
                           local_name=module.split(".")[0], line=line)
            )
        elif child.type == "aliased_import":
            dotted = child.child_by_field_name("name")
            alias = child.child_by_field_name("alias")
            module = _text(dotted, source) if dotted else ""
            local_name = _text(alias, source) if alias else module.split(".")[0]
            idx.imports.append(
                RawImport(kind="import", module=module, level=0, imported_name=None,
                           local_name=local_name, line=line)
            )


def _handle_import_from_statement(node: Node, source: bytes, idx: FileIndex) -> None:
    line = node.start_point.row + 1
    module_node = node.child_by_field_name("module_name")
    module, level = _parse_module_name(module_node, source)

    for i, child in enumerate(node.children):
        if child.type == "wildcard_import":
            idx.imports.append(
                RawImport(kind="from", module=module, level=level, imported_name="*",
                           local_name="*", line=line)
            )
            continue
        if node.field_name_for_child(i) != "name":
            continue
        if child.type == "dotted_name":
            name = _text(child, source)
            idx.imports.append(
                RawImport(kind="from", module=module, level=level, imported_name=name,
                           local_name=name, line=line)
            )
        elif child.type == "aliased_import":
            name_node = child.child_by_field_name("name")
            alias_node = child.child_by_field_name("alias")
            name = _text(name_node, source) if name_node else ""
            local_name = _text(alias_node, source) if alias_node else name
            idx.imports.append(
                RawImport(kind="from", module=module, level=level, imported_name=name,
                           local_name=local_name, line=line)
            )


def _parse_module_name(node: Node | None, source: bytes) -> tuple[str | None, int]:
    if node is None:
        return None, 0
    if node.type == "dotted_name":
        return _text(node, source), 0
    if node.type == "relative_import":
        level = 0
        module = None
        for child in node.children:
            if child.type == "import_prefix":
                level = sum(1 for c in child.children if c.type == ".")
            elif child.type == "dotted_name":
                module = _text(child, source)
        return module, level
    return None, 0


def _parse_string_list(node: Node | None, source: bytes) -> list[str] | None:
    if node is None or node.type not in ("list", "tuple"):
        return None
    names: list[str] = []
    for child in node.children:
        if child.type == "string":
            text = _text(child, source)
            names.append(text.strip("'\" "))
    return names or None
