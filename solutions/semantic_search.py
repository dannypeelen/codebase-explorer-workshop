"""Reference solution for Exercise 1 — see backend/exercises/semantic_search.py
for the version with TODOs, and exercises/01-semantic-search.md for the
walkthrough. Drop this file's two implementations into the matching spots
in backend/exercises/semantic_search.py if you get stuck.
"""

from __future__ import annotations

import math

from backend import data_store
from backend.gemini_client import GeminiClient, GeminiUnavailable

SOURCE_TYPES_BY_NODE_TYPE: dict[str, list[str]] = {
    "Class": ["class_source", "class_summary"],
    "Function": ["function_source", "function_summary"],
    "Method": ["function_source", "function_summary"],
    "File": ["doc"],
    "Issue": ["issue_body"],
    "PullRequest": ["pr_body"],
    "Comment": ["issue_comment", "pr_comment", "review_comment", "discussion_comment"],
    "Discussion": ["discussion_body"],
    "Commit": ["commit_message"],
    "Concept": ["concept"],
}


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def semantic_search(
    query: str,
    client: GeminiClient | None,
    top_k: int = 10,
    node_type: str | None = None,
    query_vector: list[float] | None = None,
) -> list[dict]:
    if query_vector is None:
        if client is None:
            raise GeminiUnavailable(
                "Gemini is not configured (GEMINI_API_KEY unset) — semantic search is unavailable; "
                "graph browsing still works"
            )
        query_vector = client.embed_query(query)

    source_types = SOURCE_TYPES_BY_NODE_TYPE.get(node_type) if node_type else None
    source_type_set = set(source_types) if source_types else None

    scored: list[tuple[dict, float]] = []
    for emb_row in data_store.EMBEDDINGS:
        if source_type_set is not None and emb_row["source_type"] not in source_type_set:
            continue
        scored.append((emb_row, cosine_similarity(query_vector, emb_row["vector"])))

    best_by_node: dict[str, tuple[dict, float]] = {}
    for emb_row, similarity in scored:
        node_id = emb_row["node_id"]
        if node_id not in best_by_node or similarity > best_by_node[node_id][1]:
            best_by_node[node_id] = (emb_row, similarity)

    ranked = sorted(best_by_node.values(), key=lambda pair: pair[1], reverse=True)[:top_k]

    results = []
    for emb_row, similarity in ranked:
        node = data_store.get_node(emb_row["node_id"])
        results.append({
            "node_id": emb_row["node_id"],
            "type": node["type"] if node else None,
            "natural_key": node["natural_key"] if node else None,
            "similarity": similarity,
            "source_type": emb_row["source_type"],
            "snippet": emb_row["chunk_text"][:500],
            "file_path": emb_row["file_path"],
            "line_start": emb_row["line_start"],
            "line_end": emb_row["line_end"],
            "github_ref": emb_row["github_ref"],
        })
    return results
