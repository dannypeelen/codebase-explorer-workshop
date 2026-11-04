"""Shared guard against LLM-fabricated evidence: a quote is only accepted
if it's actually present (whitespace/case-tolerant) in the text it claims
to come from. Copied from the original project's llm/validation.py — a
pure utility, not something there's any pedagogical value in
re-deriving. Used by backend/exercises/qa.py (Exercise 4).
"""

from __future__ import annotations

import re

_WS = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _WS.sub(" ", text).strip().lower()


def quote_found_in_text(quote: str, source_text: str) -> bool:
    if not quote or not quote.strip():
        return False
    return _normalize(quote) in _normalize(source_text)
