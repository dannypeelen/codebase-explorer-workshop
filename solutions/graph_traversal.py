"""Reference solution for Exercise 2 — see backend/exercises/graph_traversal.py
for the version with TODOs, and exercises/02-graph-traversal.md for the
walkthrough.
"""

from __future__ import annotations

from backend import data_store


def _candidate_edges(node_id: str, direction: str) -> list[dict]:
    if direction == "out":
        return list(data_store.OUT_EDGES.get(node_id, []))
    if direction == "in":
        return list(data_store.IN_EDGES.get(node_id, []))
    if direction == "both":
        return list(data_store.OUT_EDGES.get(node_id, [])) + list(data_store.IN_EDGES.get(node_id, []))
    raise ValueError(f"direction must be 'out', 'in', or 'both', got {direction!r}")


def _other_end(edge: dict, from_node_id: str) -> str:
    return edge["dst_id"] if edge["src_id"] == from_node_id else edge["src_id"]


def get_neighbors(
    node_id: str,
    edge_types: list[str] | None = None,
    node_types: list[str] | None = None,
    direction: str = "both",
) -> list[dict]:
    edge_type_set = set(edge_types) if edge_types else None
    node_type_set = set(node_types) if node_types else None

    results = []
    for edge in _candidate_edges(node_id, direction):
        if edge_type_set is not None and edge["type"] not in edge_type_set:
            continue
        neighbor_id = _other_end(edge, node_id)
        neighbor = data_store.get_node(neighbor_id)
        if neighbor is None:
            continue
        if node_type_set is not None and neighbor["type"] not in node_type_set:
            continue
        results.append({
            "edge_id": edge["id"],
            "edge_type": edge["type"],
            "edge_properties": edge["properties"],
            "rel_direction": "out" if edge["src_id"] == node_id else "in",
            "node_id": neighbor["id"],
            "node_type": neighbor["type"],
            "node_repo": neighbor["repo"],
            "natural_key": neighbor["natural_key"],
            "node_properties": neighbor["properties"],
        })
    return results


def get_subgraph(
    seed_ids: str | list[str],
    depth: int = 2,
    edge_types: list[str] | None = None,
    direction: str = "out",
) -> dict:
    seeds = [seed_ids] if isinstance(seed_ids, str) else list(seed_ids)
    if not seeds:
        return {"nodes": [], "edges": []}

    edge_type_set = set(edge_types) if edge_types else None
    visited: set[str] = set(seeds)
    frontier = list(seeds)

    for _ in range(depth):
        if not frontier:
            break
        next_frontier: list[str] = []
        for node_id in frontier:
            for edge in _candidate_edges(node_id, direction):
                if edge_type_set is not None and edge["type"] not in edge_type_set:
                    continue
                neighbor_id = _other_end(edge, node_id)
                if neighbor_id in visited:
                    continue
                visited.add(neighbor_id)
                next_frontier.append(neighbor_id)
        frontier = next_frontier

    nodes = data_store.get_nodes(list(visited))
    edges = data_store.get_edges_among(list(visited))
    return {"nodes": nodes, "edges": edges}
