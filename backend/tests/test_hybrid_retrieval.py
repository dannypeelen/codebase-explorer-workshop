"""Checkpoint for Exercise 3. Run with: pytest backend/tests/test_hybrid_retrieval.py -v

Requires Exercises 1 and 2 to already be implemented — assemble_context
calls both. Fully offline: a `query_vector` stands in for a live Gemini
embedding call, same as Exercise 1's tests.
"""

from backend import data_store
from backend.exercises.hybrid_retrieval import assemble_context

FLASK_CLASS_NODE_ID = "fb8982be947a7d75be29c16cff90e721"


def _flask_class_query_vector() -> list[float]:
    return data_store.EMBEDDINGS_BY_NODE[FLASK_CLASS_NODE_ID][0]["vector"]


def test_assemble_context_includes_the_semantic_seed():
    context_items, references = assemble_context("irrelevant", client=None, query_vector=_flask_class_query_vector())

    ids = [item["node_id"] for item in context_items]
    assert FLASK_CLASS_NODE_ID in ids
    assert FLASK_CLASS_NODE_ID in references


def test_assemble_context_expands_beyond_the_seed_via_graph_traversal():
    context_items, _ = assemble_context("irrelevant", client=None, query_vector=_flask_class_query_vector())

    # A hybrid result should be bigger than a bare semantic hit — the
    # seed's graph neighborhood (e.g. its containing file, methods it
    # DEFINES) should have been pulled in too.
    assert len(context_items) > 1


def test_assemble_context_every_item_has_a_reference():
    context_items, references = assemble_context("irrelevant", client=None, query_vector=_flask_class_query_vector())

    for item in context_items:
        assert item["node_id"] in references
        assert "text" in item and item["text"]


def test_assemble_context_respects_max_context_items():
    from backend.exercises import hybrid_retrieval

    context_items, _ = assemble_context("irrelevant", client=None, query_vector=_flask_class_query_vector())
    assert len(context_items) <= hybrid_retrieval.MAX_CONTEXT_ITEMS
