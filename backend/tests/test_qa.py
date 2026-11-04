"""Checkpoint for Exercise 4. Run with: pytest backend/tests/test_qa.py -v

Uses a fake Gemini client instead of a real one — same injected-dependency
pattern as Exercises 1/3's `query_vector`. The point of this exercise is
citation *validation*, which these tests exercise directly by handing
`answer_question` a response that includes one honest citation and two
fabricated ones.
"""

from backend import data_store
from backend.exercises.hybrid_retrieval import assemble_context
from backend.exercises.qa import AnsweredQuestion, Citation, answer_question

FLASK_CLASS_NODE_ID = "fb8982be947a7d75be29c16cff90e721"


def _flask_class_query_vector() -> list[float]:
    return data_store.EMBEDDINGS_BY_NODE[FLASK_CLASS_NODE_ID][0]["vector"]


class FakeGeminiClient:
    """Stands in for backend.gemini_client.GeminiClient — returns a fixed
    AnsweredQuestion instead of calling the real API, no network needed.
    """

    def __init__(self, response: AnsweredQuestion):
        self._response = response

    def generate_structured(self, prompt, response_schema, system_instruction=None):
        return self._response


def test_answer_question_returns_degraded_response_when_client_is_none():
    result = answer_question("How does Flask handle requests?", client=None)
    assert result["degraded"] is True
    assert result["citations"] == []
    assert result["unable_to_answer"] is True


def test_answer_question_keeps_a_real_citation_with_a_real_quote():
    query_vector = _flask_class_query_vector()
    context_items, references = assemble_context("irrelevant", client=None, query_vector=query_vector)
    real_text = next(item["text"] for item in context_items if item["node_id"] == FLASK_CLASS_NODE_ID)
    real_quote = real_text[:40].strip()

    fake = FakeGeminiClient(AnsweredQuestion(
        answer="Flask is the main application class.",
        citations=[Citation(node_id=FLASK_CLASS_NODE_ID, quote=real_quote)],
    ))

    result = answer_question("What is the Flask class?", client=fake, query_vector=query_vector)

    assert result["degraded"] is False
    assert result["dropped_citations"] == 0
    assert len(result["citations"]) == 1
    assert result["citations"][0]["node_id"] == FLASK_CLASS_NODE_ID
    assert result["citations"][0]["quote"] == real_quote


def test_answer_question_drops_citation_to_a_node_outside_the_context():
    query_vector = _flask_class_query_vector()
    fake = FakeGeminiClient(AnsweredQuestion(
        answer="Something.",
        citations=[Citation(node_id="not-a-real-node-id", quote="anything")],
    ))

    result = answer_question("A question", client=fake, query_vector=query_vector)

    assert result["dropped_citations"] == 1
    assert result["citations"] == []


def test_answer_question_drops_citation_with_a_fabricated_quote():
    query_vector = _flask_class_query_vector()
    fake = FakeGeminiClient(AnsweredQuestion(
        answer="Something.",
        citations=[Citation(node_id=FLASK_CLASS_NODE_ID, quote="this exact sentence is not in the source text")],
    ))

    result = answer_question("A question", client=fake, query_vector=query_vector)

    assert result["dropped_citations"] == 1
    assert result["citations"] == []
