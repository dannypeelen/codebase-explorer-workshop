"""EXERCISE 1 — Gemini-powered semantic search.

Goal: given a natural-language query like "How does Flask handle incoming
HTTP requests?", find the functions/classes/files/discussions whose
*meaning* is closest to it — not keyword matching, vector similarity.

The embeddings for every chunk of the Flask codebase (function bodies,
class bodies, issue/PR text, ...) were already generated with Gemini and
shipped in `data/flask_embeddings.json` — see `backend/data_store.py`.
What's missing is: embed the *query* the same way, compare it against
every stored vector, and turn the closest matches into a ranked,
deduplicated result list. That's what you're building.

See exercises/01-semantic-search.md for the full walkthrough. Reference
solution: solutions/semantic_search.py.
"""

from __future__ import annotations

from .. import data_store
from ..gemini_client import GeminiClient, GeminiUnavailable

# Which embeddings.source_type values belong to each NodeType — lets a
# caller search only within, say, Functions/Methods. Already correct,
# nothing to change here.
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
    """Return the cosine similarity of two equal-length vectors, in [-1, 1]
    (in practice, for Gemini embeddings, almost always in [0, 1] — closer
    to 1 means more semantically similar).

    cosine_similarity(a, b) = dot(a, b) / (||a|| * ||b||)

    TODO(Exercise 1.1): implement this. No libraries needed — a couple of
    `sum(...)` calls and `math.sqrt`.
    """
    raise NotImplementedError("Exercise 1.1: implement cosine_similarity")


def semantic_search(
    query: str,
    client: GeminiClient | None,
    top_k: int = 10,
    node_type: str | None = None,
    query_vector: list[float] | None = None,
) -> list[dict]:
    """Embed `query`, rank every stored embedding by similarity to it,
    collapse multiple chunks of the same node down to its single best
    hit, and return the top `top_k` as hydrated result dicts.

    `query_vector`, if given, is used instead of calling Gemini — this is
    how tests and the offline demo mode exercise this function without a
    live API call. In the real `/search` route, it's left `None` and you
    compute it from `client`.
    """
    if query_vector is None:
        if client is None:
            raise GeminiUnavailable(
                "Gemini is not configured (GEMINI_API_KEY unset) — semantic search is unavailable; "
                "graph browsing still works"
            )
        # TODO(Exercise 1.2): get a vector for `query` from `client`.
        # Hint: GeminiClient has an `embed_query(text)` method.
        raise NotImplementedError("Exercise 1.2: embed the query")

    source_types = SOURCE_TYPES_BY_NODE_TYPE.get(node_type) if node_type else None

    # TODO(Exercise 1.3): score every embedding in data_store.EMBEDDINGS
    # against `query_vector` with cosine_similarity, but only the ones
    # matching `source_types` when it's set (skip the rest). Build a list
    # of (embedding_row, similarity) pairs.
    scored: list[tuple[dict, float]] = []
    raise NotImplementedError("Exercise 1.3: score every embedding against the query vector")

    # TODO(Exercise 1.4): collapse `scored` down to one entry per node_id
    # (several chunks can belong to the same node — keep only the
    # highest-similarity chunk for each), sort by similarity descending,
    # and keep the top `top_k`.
    ranked: list[tuple[dict, float]] = []
    raise NotImplementedError("Exercise 1.4: dedupe by node_id and keep the top_k")

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
