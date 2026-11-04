"""Checkpoint for Exercise 1. Run with: pytest backend/tests/test_semantic_search.py -v

No Gemini API key needed — every test passes a `query_vector` directly
instead of calling the real embedding API, so this is fully offline and
deterministic.
"""

import pytest

from backend import data_store
from backend.exercises.semantic_search import cosine_similarity, semantic_search

# A real Class node — "class Flask" in src/flask/app.py — that has more
# than one embedded chunk (its source is long enough to be chunked). A
# good target for both a similarity sanity check and a dedup check.
FLASK_CLASS_NODE_ID = "fb8982be947a7d75be29c16cff90e721"


def test_cosine_similarity_identical_vectors():
    assert cosine_similarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]) == pytest.approx(1.0)


def test_cosine_similarity_orthogonal_vectors():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)


def test_cosine_similarity_opposite_vectors():
    assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)


def _a_chunk_vector_for(node_id: str) -> list[float]:
    chunks = data_store.EMBEDDINGS_BY_NODE[node_id]
    assert len(chunks) > 1, "expected a multi-chunk node for this fixture"
    return chunks[0]["vector"]


def test_semantic_search_finds_exact_vector_match():
    query_vector = _a_chunk_vector_for(FLASK_CLASS_NODE_ID)
    results = semantic_search("irrelevant text — query_vector overrides embedding", client=None, top_k=5, query_vector=query_vector)

    assert len(results) > 0
    top = results[0]
    assert top["node_id"] == FLASK_CLASS_NODE_ID
    assert top["similarity"] == pytest.approx(1.0, abs=1e-6)
    assert top["type"] == "Class"
    assert top["natural_key"] == "src/flask/app.py::Flask"


def test_semantic_search_dedupes_multi_chunk_nodes():
    query_vector = _a_chunk_vector_for(FLASK_CLASS_NODE_ID)
    results = semantic_search("irrelevant", client=None, top_k=20, query_vector=query_vector)

    node_ids = [r["node_id"] for r in results]
    assert node_ids.count(FLASK_CLASS_NODE_ID) == 1, "each node should appear at most once, even with several chunks"


def test_semantic_search_respects_top_k():
    query_vector = _a_chunk_vector_for(FLASK_CLASS_NODE_ID)
    results = semantic_search("irrelevant", client=None, top_k=3, query_vector=query_vector)
    assert len(results) <= 3


def test_semantic_search_filters_by_node_type():
    query_vector = _a_chunk_vector_for(FLASK_CLASS_NODE_ID)
    results = semantic_search("irrelevant", client=None, top_k=10, node_type="Issue", query_vector=query_vector)
    assert all(r["type"] == "Issue" for r in results)
