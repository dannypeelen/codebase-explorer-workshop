"""Prebuilt composition layer — not an exercise. Mirrors the role of the
original project's `grapher/graph_service.py`: compose the primitives
from `backend/exercises/graph_traversal.py` into the higher-level
operations the API and frontend actually call (a filtered graph slice, a
node's detail view, impact analysis). No traversal logic of its own
beyond `find_paths`, which is out of scope for the workshop's four
exercises and is included here fully implemented so the UI's "find a
path between two nodes" feature works regardless.

Because this module calls into `exercises.graph_traversal`, `/subgraph`,
`/nodes/{id}/neighbors`, `/nodes/{id}` (its relationship counts), and
`/impact/{id}` only work once Exercise 2 is implemented — "exercise
completion progressively activates backend functionality" from the
workshop brief. `/graph` and `/paths` don't depend on the exercise and
work from the start.
"""

from __future__ import annotations

from . import data_store
from .exercises import graph_traversal

DEFAULT_GRAPH_LIMIT = 200
MAX_GRAPH_LIMIT = 2000

IMPACT_FORWARD_EDGE_TYPES = ["CALLS", "IMPORTS", "DEPENDS_ON", "INHERITS"]
IMPACT_CALLER_EDGE_TYPES = ["CALLS"]
CONTAINMENT_EDGE_TYPES = ["PART_OF"]
HISTORY_EDGE_TYPES = ["MODIFIED_BY", "PART_OF", "MOTIVATED_BY"]

CALL_GRAPH_CAVEAT = (
    "Caller/dependency traversal follows static CALLS/IMPORTS/DEPENDS_ON/INHERITS "
    "edges only. Dynamic dispatch and other runtime-constructed call paths won't "
    "appear here — a lower bound on what could be affected, not a guarantee of "
    "completeness."
)
TEST_HEURISTIC_CAVEAT = (
    "\"Tests\" are inferred from which callers live in a test-looking file path "
    "(test_*.py, *_test.py, or a tests/ directory) — a path-name heuristic, not a "
    "verified test-to-symbol relationship."
)


def _is_test_path(natural_key: str) -> bool:
    path = natural_key.split("::", 1)[0]
    filename = path.rsplit("/", 1)[-1]
    return filename.startswith("test_") or filename.endswith("_test.py") or f"/{path}/".count("/tests/") > 0


def get_repository_status() -> dict:
    stats = data_store.repo_stats()
    stats["ingested"] = stats["total_nodes"] > 0
    return stats


def get_graph(node_types: list[str] | None = None, edge_types: list[str] | None = None, limit: int = DEFAULT_GRAPH_LIMIT) -> dict:
    limit = max(1, min(limit, MAX_GRAPH_LIMIT))
    nodes = data_store.list_nodes(types=node_types)
    nodes = sorted(nodes, key=lambda n: (n["type"], n["natural_key"]))[:limit]
    node_ids = [n["id"] for n in nodes]
    edges = data_store.get_edges_among(node_ids, edge_types=edge_types)
    return {"nodes": nodes, "edges": edges, "truncated": len(nodes) == limit}


def get_node_details(node_id: str) -> dict | None:
    node = data_store.get_node(node_id)
    if node is None:
        return None
    neighbors = graph_traversal.get_neighbors(node_id)
    counts: dict[str, int] = {}
    for n in neighbors:
        key = f"{n['edge_type']}:{n['rel_direction']}"
        counts[key] = counts.get(key, 0) + 1
    return {**node, "relationship_counts": counts}


def get_neighbors(node_id: str, edge_types: list[str] | None = None, node_types: list[str] | None = None, direction: str = "both") -> list[dict]:
    return graph_traversal.get_neighbors(node_id, edge_types=edge_types, node_types=node_types, direction=direction)


def get_subgraph(node_id: str, depth: int = 2, edge_types: list[str] | None = None, direction: str = "out") -> dict:
    return graph_traversal.get_subgraph(node_id, depth=depth, edge_types=edge_types, direction=direction)


def find_paths(from_id: str, to_id: str, max_depth: int = 6, edge_types: list[str] | None = None, directed: bool = False, limit: int = 5) -> dict:
    """Shortest paths by hop count, via a frontier-by-frontier BFS with a
    global visited set (so it stays polynomial even on a hub node with
    many callers) — prebuilt, not part of Exercise 2's scope.
    """
    max_depth = max(1, min(max_depth, 8))
    if from_id == to_id:
        return {"found": True, "paths": [{"length": 0, "nodes": data_store.get_nodes([from_id]), "edges": []}]}

    edge_type_set = set(edge_types) if edge_types else None

    def frontier_edges(node_ids: list[str]) -> list[dict]:
        seen_ids = set()
        out = []
        for nid in node_ids:
            candidates = data_store.OUT_EDGES.get(nid, []) if directed else (
                data_store.OUT_EDGES.get(nid, []) + data_store.IN_EDGES.get(nid, [])
            )
            for e in candidates:
                if edge_type_set is not None and e["type"] not in edge_type_set:
                    continue
                if e["id"] in seen_ids:
                    continue
                seen_ids.add(e["id"])
                out.append(e)
        return out

    parent: dict[str, list[tuple[str, str]]] = {from_id: []}
    frontier = [from_id]
    found_at_depth: int | None = None

    for _ in range(max_depth):
        if not frontier or found_at_depth is not None:
            break
        frontier_set = set(frontier)
        next_frontier: list[str] = []
        newly_seen: set[str] = set()
        for edge in frontier_edges(frontier):
            src, dst = edge["src_id"], edge["dst_id"]
            candidates = [(src, dst)] if src in frontier_set else []
            if not directed and dst in frontier_set and dst != src:
                candidates.append((dst, src))
            for frm, to in candidates:
                if to in parent and to not in newly_seen:
                    continue
                parent.setdefault(to, []).append((frm, edge["id"]))
                if to not in newly_seen:
                    newly_seen.add(to)
                    next_frontier.append(to)
        if to_id in newly_seen:
            found_at_depth = True
        frontier = next_frontier

    if to_id not in parent or not parent[to_id]:
        return {"found": False, "paths": []}

    results: list[dict] = []

    def walk(node: str, node_path: list[str], edge_path: list[str]) -> None:
        if len(results) >= limit:
            return
        if node == from_id:
            results.append({"node_ids": [from_id, *reversed(node_path)], "edge_ids": list(reversed(edge_path))})
            return
        for prev_node, edge_id in parent.get(node, []):
            walk(prev_node, [*node_path, node], [*edge_path, edge_id])
            if len(results) >= limit:
                return

    walk(to_id, [], [])

    resolved = []
    for r in results:
        resolved.append({
            "length": len(r["edge_ids"]),
            "nodes": data_store.get_nodes(r["node_ids"]),
            "edges": [e for eid in r["edge_ids"] for e in data_store.EDGES if e["id"] == eid],
        })
    return {"found": True, "paths": resolved}


def impact_analysis(node_id: str, max_depth: int = 3, max_results: int = 50) -> dict | None:
    target = data_store.get_node(node_id)
    if target is None:
        return None

    direct_callers = graph_traversal.get_neighbors(node_id, edge_types=IMPACT_CALLER_EDGE_TYPES, direction="in")
    direct_dependencies = graph_traversal.get_neighbors(node_id, edge_types=IMPACT_FORWARD_EDGE_TYPES, direction="out")

    caller_subgraph = graph_traversal.get_subgraph(node_id, depth=max_depth, edge_types=IMPACT_CALLER_EDGE_TYPES, direction="in")
    transitive_callers = [n for n in caller_subgraph["nodes"] if n["id"] != node_id][:max_results]
    caller_ids = [n["id"] for n in transitive_callers]

    file_subgraph = graph_traversal.get_subgraph(node_id, depth=1, edge_types=CONTAINMENT_EDGE_TYPES, direction="out")
    containing_files = [n for n in file_subgraph["nodes"] if n["id"] != node_id and n["type"] == "File"]
    file_ids = [n["id"] for n in containing_files]

    affected_module_ids = set(file_ids)
    if caller_ids:
        caller_file_subgraph = graph_traversal.get_subgraph(caller_ids, depth=1, edge_types=CONTAINMENT_EDGE_TYPES, direction="out")
        affected_module_ids.update(n["id"] for n in caller_file_subgraph["nodes"] if n["type"] == "File" and n["id"] not in caller_ids)
    affected_modules = data_store.get_nodes(list(affected_module_ids))

    caller_natural_keys: dict[str, str] = {n["node_id"]: n["natural_key"] for n in direct_callers}
    caller_natural_keys.update({n["id"]: n["natural_key"] for n in transitive_callers})
    test_ids = [cid for cid, nk in caller_natural_keys.items() if _is_test_path(nk)]
    tests = data_store.get_nodes(test_ids) if test_ids else []

    history_nodes: list[dict] = []
    design_constraints: list[dict] = []
    if file_ids:
        history_subgraph = graph_traversal.get_subgraph(file_ids, depth=3, edge_types=HISTORY_EDGE_TYPES, direction="out")
        for n in history_subgraph["nodes"]:
            if n["id"] in file_ids:
                continue
            if n["type"] == "Commit":
                history_nodes.append(n)
            elif n["type"] == "Concept":
                design_constraints.append(n)
        history_nodes.sort(key=lambda n: (n.get("properties") or {}).get("committer_date", ""), reverse=True)
        history_nodes = history_nodes[:max_results]

    return {
        "target": target,
        "direct_callers": direct_callers,
        "direct_dependencies": direct_dependencies,
        "transitive_callers": transitive_callers,
        "affected_modules": affected_modules,
        "tests": tests,
        "historical_changes": history_nodes,
        "design_constraints": design_constraints,
        "caveats": [CALL_GRAPH_CAVEAT, TEST_HEURISTIC_CAVEAT],
    }
