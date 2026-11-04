"""Reference solution for Exercise 3 — see
backend/exercises/hybrid_retrieval.py for the version with TODOs, and
exercises/03-hybrid-retrieval.md for the walkthrough.
"""

from __future__ import annotations

from backend import data_store
from backend.gemini_client import GeminiClient

from . import graph_traversal, semantic_search

MAX_SEED_HITS = 5
MAX_CONTEXT_ITEMS = 25
EXPANSION_DEPTH = 1


def _text_for_node(node: dict, embedding_snippet: str | None) -> str:
    if embedding_snippet:
        return embedding_snippet
    props = node.get("properties") or {}
    for key in ("body", "message", "statement", "title"):
        if props.get(key):
            return str(props[key])[:800]
    return node.get("natural_key", "")


def _reference_for_node(node: dict) -> dict:
    props = node.get("properties") or {}
    ref = {"node_id": node["id"], "type": node["type"], "natural_key": node["natural_key"]}
    if props.get("url"):
        ref["url"] = props["url"]
    if node["type"] == "File":
        ref["file_path"] = node["natural_key"]
    return ref


def assemble_context(
    query: str,
    client: GeminiClient | None,
    query_vector: list[float] | None = None,
) -> tuple[list[dict], dict[str, dict]]:
    seed_hits = semantic_search.semantic_search(query, client, top_k=MAX_SEED_HITS, query_vector=query_vector)
    snippet_by_node = {h["node_id"]: h["snippet"] for h in seed_hits}

    all_ids: set[str] = {h["node_id"] for h in seed_hits}
    for hit in seed_hits:
        subgraph = graph_traversal.get_subgraph(hit["node_id"], depth=EXPANSION_DEPTH)
        all_ids.update(n["id"] for n in subgraph["nodes"])
        if len(all_ids) >= MAX_CONTEXT_ITEMS:
            break

    all_ids = set(list(all_ids)[:MAX_CONTEXT_ITEMS])
    node_rows = data_store.get_nodes(list(all_ids))

    context_items = []
    references: dict[str, dict] = {}
    for node in node_rows:
        text = _text_for_node(node, snippet_by_node.get(node["id"]))
        context_items.append({"node_id": node["id"], "type": node["type"], "natural_key": node["natural_key"], "text": text})
        references[node["id"]] = _reference_for_node(node)
    return context_items, references
