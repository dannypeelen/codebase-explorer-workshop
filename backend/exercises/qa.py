"""EXERCISE 4 — Gemini codebase Q&A.

Goal: answer a question like "How does Flask's request context work?"
using *only* the hybrid context Exercise 3 assembled, with every factual
claim backed by a citation pointing at a real node — and never trust a
citation blindly: Gemini can still cite something that wasn't in the
context, or invent a quote that isn't really there, so every citation
gets checked against the actual context before it's returned.

See exercises/04-qa.md for the full walkthrough. Reference solution:
solutions/qa.py.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, Field

from ..gemini_client import GeminiClient, GeminiUnavailable
from ..validation import quote_found_in_text
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


def answer_question(
    question: str,
    client: GeminiClient | None,
    query_vector: list[float] | None = None,
) -> dict:
    """Return `{"answer", "citations", "dropped_citations", "unable_to_answer", "degraded"}`.

    TODO(Exercise 4): implement the pipeline.
      1. If `client` is `None`, return a degraded response immediately —
         `answer` explains Q&A is unavailable, `citations: []`,
         `dropped_citations: 0`, `unable_to_answer: True`, `degraded: True`.
      2. Call `hybrid_retrieval.assemble_context(question, client,
         query_vector=query_vector)` to get `(context_items, references)`.
         If `context_items` is empty, return a non-degraded "no relevant
         content found" response (same shape as step 1, `degraded: False`).
      3. Build the prompt from `PROMPT_TEMPLATE`, JSON-encoding
         `context_items` (`json.dumps(context_items)` is fine).
      4. Call `client.generate_structured(prompt, AnsweredQuestion,
         system_instruction=SYSTEM_INSTRUCTION)`.
      5. For each citation Gemini returned: keep it only if its `node_id`
         is a key in `references` AND `quote_found_in_text(citation.quote,
         <that context item's text>)` is true. Otherwise drop it (count
         it in `dropped_citations`, don't raise).
      6. Return `{"answer": result.answer, "citations": <kept, each
         merged with its reference dict and the quote>, "dropped_citations":
         <count>, "unable_to_answer": result.unable_to_answer, "degraded": False}`.

    Wrap the `assemble_context`/`generate_structured` calls so a
    `GeminiUnavailable` (quota, network, bad key) degrades the response
    instead of raising — same rule as step 1.
    """
    raise NotImplementedError("Exercise 4: implement answer_question")
