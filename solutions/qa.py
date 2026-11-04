"""Reference solution for Exercise 4 — see backend/exercises/qa.py for the
version with TODOs, and exercises/04-qa.md for the walkthrough.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, Field

from backend.gemini_client import GeminiClient, GeminiUnavailable
from backend.validation import quote_found_in_text

from . import hybrid_retrieval

SYSTEM_INSTRUCTION = """You answer questions about a software project using ONLY the \
context items given to you. Every factual claim in your answer must have a \
corresponding citation with the exact node_id and a short verbatim quote from that \
item's text. Never cite a node_id that isn't in the context. Never invent a quote — \
copy it exactly from the item's text. If the context is insufficient to answer, set \
unable_to_answer=true and say what's missing in `answer` instead of guessing."""

PROMPT_TEMPLATE = """Context items (JSON, cite only these node_ids):
{context_json}

Question: {question}"""


class Citation(BaseModel):
    node_id: str
    quote: str


class AnsweredQuestion(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    unable_to_answer: bool = False


def _degraded(message: str) -> dict:
    return {"answer": message, "citations": [], "dropped_citations": 0, "unable_to_answer": True, "degraded": True}


def answer_question(
    question: str,
    client: GeminiClient | None,
    query_vector: list[float] | None = None,
) -> dict:
    if client is None:
        return _degraded(
            "Question answering is unavailable right now (Gemini is not configured). "
            "Graph browsing and search still work."
        )

    try:
        context_items, references = hybrid_retrieval.assemble_context(question, client, query_vector=query_vector)
    except GeminiUnavailable as e:
        return _degraded(f"Question answering is unavailable right now: {e}")

    if not context_items:
        return {
            "answer": "No relevant indexed content was found for this question.",
            "citations": [], "dropped_citations": 0, "unable_to_answer": True, "degraded": False,
        }

    prompt = PROMPT_TEMPLATE.format(context_json=json.dumps(context_items, separators=(",", ":")), question=question)
    try:
        result = client.generate_structured(prompt, AnsweredQuestion, system_instruction=SYSTEM_INSTRUCTION)
    except GeminiUnavailable as e:
        return _degraded(f"Question answering is unavailable right now: {e}")

    text_by_id = {item["node_id"]: item["text"] for item in context_items}
    kept_citations = []
    dropped = 0
    for citation in result.citations:
        if citation.node_id not in references:
            dropped += 1
            continue
        if not quote_found_in_text(citation.quote, text_by_id.get(citation.node_id, "")):
            dropped += 1
            continue
        kept_citations.append({**references[citation.node_id], "quote": citation.quote})

    return {
        "answer": result.answer,
        "citations": kept_citations,
        "dropped_citations": dropped,
        "unable_to_answer": result.unable_to_answer,
        "degraded": False,
    }
