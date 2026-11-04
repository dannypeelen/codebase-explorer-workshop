"""EXERCISE 2 — Graph traversal.

Goal: given a node (say, the `Flask.wsgi_app` method), answer "what's
directly connected to this?" and "what's reachable within N hops,
following only certain relationship types?". That's the primitive every
other feature in this app needs: the graph canvas expanding a node, the
relationships tab, and (once you're done here) Exercise 3's hybrid
retrieval all call into this module.

The graph itself (nodes + edges, real `pallets/flask` data) is already
loaded for you in `backend/data_store.py`, with `OUT_EDGES`/`IN_EDGES`
adjacency dicts built so a one-hop lookup is a single dict access instead
of a scan over 22k edges. You're implementing the traversal *logic* on
top of that, not the storage.

See exercises/02-graph-traversal.md for the full walkthrough. Reference
solution: solutions/graph_traversal.py.
"""

from __future__ import annotations

from .. import data_store


def _candidate_edges(node_id: str, direction: str) -> list[dict]:
    """Every edge touching `node_id` in the requested direction. Already
    implemented — this is just data_store plumbing, not the exercise.
    """
    if direction == "out":
        return list(data_store.OUT_EDGES.get(node_id, []))
    if direction == "in":
        return list(data_store.IN_EDGES.get(node_id, []))
    if direction == "both":
        return list(data_store.OUT_EDGES.get(node_id, [])) + list(data_store.IN_EDGES.get(node_id, []))
    raise ValueError(f"direction must be 'out', 'in', or 'both', got {direction!r}")


def get_neighbors(
    node_id: str,
    edge_types: list[str] | None = None,
    node_types: list[str] | None = None,
    direction: str = "both",
) -> list[dict]:
    """One hop from `node_id`. Return one dict per matching edge:

        {"edge_id", "edge_type", "edge_properties", "rel_direction",
         "node_id", "node_type", "node_repo", "natural_key", "node_properties"}

    `rel_direction` is "out" if `node_id` is the edge's src (the neighbor
    is the dst), "in" if `node_id` is the edge's dst (the neighbor is the
    src) — a node reachable via two different edges should appear twice,
    once per edge, not deduped.

    TODO(Exercise 2.1): implement this using `_candidate_edges` above and
    `data_store.get_node`. Filter out edges whose type isn't in
    `edge_types` (when given), and neighbors whose type isn't in
    `node_types` (when given).
    """
    raise NotImplementedError("Exercise 2.1: implement get_neighbors")


def get_subgraph(
    seed_ids: str | list[str],
    depth: int = 2,
    edge_types: list[str] | None = None,
    direction: str = "out",
) -> dict:
    """Breadth-first search from one or more seed nodes, up to `depth`
    hops, following only `edge_types` (all types if `None`). Returns
    `{"nodes": [...], "edges": [...]}` — every node reached (including
    the seeds) and every edge among them.

    TODO(Exercise 2.2): implement BFS.
      1. Normalize `seed_ids` to a list if a single string was passed.
      2. Keep a `visited` set (starts with the seeds) and a `frontier`
         list (starts as the seeds).
      3. For up to `depth` rounds: for each node in the frontier, look at
         its candidate edges (reuse `_candidate_edges`, filtered by
         `edge_types`), find the neighbor id on the other end, and if it
         hasn't been visited yet add it to `visited` and the next
         frontier.
      4. Stop early if the frontier is empty.
      5. Hydrate `visited` into full node dicts (`data_store.get_nodes`)
         and get the edges among them (`data_store.get_edges_among`).
    """
    raise NotImplementedError("Exercise 2.2: implement get_subgraph")
