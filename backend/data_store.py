"""Prebuilt data access layer — the workshop's stand-in for the original
project's `grapher` (Postgres+pgvector). Loads the pre-extracted, real
`pallets/flask` graph and the real Gemini embeddings shipped in `data/`
into memory once, at import time, and exposes plain read primitives over
plain Python dicts/lists.

This module is infrastructure, not an exercise: participants don't
implement data loading, they implement what to *do* with the data once
it's loaded (backend/exercises/). Every function here returns the same
shapes the original project's `grapher.repository` did — a Node is
`{id, type, repo, natural_key, properties, provenance}`, an Edge is
`{id, type, src_id, dst_id, properties, provenance}` — so the exercise
solutions and the frontend (copied from the original `visual/` unchanged)
agree on shape without translation.
"""

from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

with open(DATA_DIR / "flask_graph.json") as f:
    _graph = json.load(f)

with open(DATA_DIR / "flask_embeddings.json") as f:
    _embeddings_doc = json.load(f)

REPO = _graph["repo"]
NODES: dict[str, dict] = {n["id"]: n for n in _graph["nodes"]}
EDGES: list[dict] = _graph["edges"]
EMBEDDINGS: list[dict] = _embeddings_doc["embeddings"]

# Adjacency, built once: edge ids grouped by the node they touch, split by
# direction so a one-hop lookup or a BFS step is a dict lookup, not a scan
# over 22k edges. This is exactly the index Postgres gives you for free via
# a `src_id`/`dst_id` column index — rebuilt here in Python since there's
# no database in this workshop.
OUT_EDGES: dict[str, list[dict]] = {}
IN_EDGES: dict[str, list[dict]] = {}
for _e in EDGES:
    OUT_EDGES.setdefault(_e["src_id"], []).append(_e)
    IN_EDGES.setdefault(_e["dst_id"], []).append(_e)

# node_id -> embedding rows for that node (a node can have more than one
# chunk) — the index Exercise 1's vector search runs over.
EMBEDDINGS_BY_NODE: dict[str, list[dict]] = {}
for _emb in EMBEDDINGS:
    EMBEDDINGS_BY_NODE.setdefault(_emb["node_id"], []).append(_emb)


def get_node(node_id: str) -> dict | None:
    return NODES.get(node_id)


def get_nodes(node_ids: list[str]) -> list[dict]:
    return [NODES[nid] for nid in node_ids if nid in NODES]


def list_nodes(types: list[str] | None = None) -> list[dict]:
    if not types:
        return list(NODES.values())
    type_set = set(types)
    return [n for n in NODES.values() if n["type"] in type_set]


def get_edges_among(node_ids: list[str], edge_types: list[str] | None = None) -> list[dict]:
    """Every edge with both endpoints in `node_ids` — used to draw the
    connections between an already-decided set of nodes (e.g. for /graph
    and for hydrating a subgraph's edges).
    """
    id_set = set(node_ids)
    type_set = set(edge_types) if edge_types else None
    return [
        e for e in EDGES
        if e["src_id"] in id_set and e["dst_id"] in id_set and (type_set is None or e["type"] in type_set)
    ]


def repo_stats() -> dict:
    from collections import Counter

    node_counts = Counter(n["type"] for n in NODES.values())
    edge_counts = Counter(e["type"] for e in EDGES)
    return {
        "repo": REPO,
        "node_counts": dict(node_counts),
        "edge_counts": dict(edge_counts),
        "total_nodes": len(NODES),
        "total_edges": len(EDGES),
        "embedding_count": len(EMBEDDINGS),
    }
