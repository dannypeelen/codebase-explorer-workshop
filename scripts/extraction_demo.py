#!/usr/bin/env python3
"""Run the real structural-extraction pass (pipeline/python_indexer.py,
copied unmodified from the original project) against one real Flask
source file, and print what it finds — classes, functions, calls,
imports — with exact line numbers.

    python -m scripts.extraction_demo

This is "how extraction works," made concrete: every Function/Class/File
node and every CALLS/IMPORTS/DEFINES/PART_OF edge in data/flask_graph.json
came from exactly this kind of pass (plus a second cross-file-resolution
pass not included in this trimmed-down repo — see
docs/extraction-pipeline.md) run over every file in Flask's source tree,
plus separate passes over git history, GitHub, and Gemini. This script
only runs pass 1, on one file, to keep the example small enough to read.
"""

from __future__ import annotations

from pathlib import Path

from pipeline.python_indexer import index_file

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_FILE = ROOT / "sample-repo" / "app.py"


def main() -> None:
    idx = index_file(str(SAMPLE_FILE), "sample-repo/app.py")

    print(f"Indexed {SAMPLE_FILE.relative_to(ROOT)}\n")

    print(f"Classes ({len(idx.classes)}):")
    for c in idx.classes[:5]:
        bases = f"({', '.join(c.bases)})" if c.bases else ""
        print(f"  {c.qualified_name}{bases}  [lines {c.line_start}-{c.line_end}]")
    if len(idx.classes) > 5:
        print(f"  ... and {len(idx.classes) - 5} more")

    print(f"\nFunctions/methods ({len(idx.functions)}):")
    for f in idx.functions[:8]:
        kind = "method" if f.is_method else "function"
        print(f"  {f.qualified_name}  [{kind}, lines {f.line_start}-{f.line_end}]")
    if len(idx.functions) > 8:
        print(f"  ... and {len(idx.functions) - 8} more")

    print(f"\nCalls recorded ({len(idx.calls)}), first 8:")
    for c in idx.calls[:8]:
        callee = c.name_text or f"{c.object_text}.{c.attribute_name}" if c.callee_kind == "attribute" else c.name_text
        print(f"  {c.caller_qualified_name} -> {callee}  [line {c.line}]")

    print(f"\nImports ({len(idx.imports)}), first 8:")
    for i in idx.imports[:8]:
        if i.kind == "from":
            print(f"  from {i.module} import {i.imported_name} as {i.local_name}  [line {i.line}]")
        else:
            print(f"  import {i.module} as {i.local_name}  [line {i.line}]")

    print(
        "\nThis is pass 1 only (per-file, no cross-file resolution) — it doesn't "
        "yet know that the 'wsgi_app -> full_dispatch_request' call in this list "
        "resolves to the Flask.full_dispatch_request method a few hundred lines "
        "down. That resolution, plus git/GitHub/Gemini passes, is how "
        "data/flask_graph.json was actually built. See docs/extraction-pipeline.md."
    )


if __name__ == "__main__":
    main()
