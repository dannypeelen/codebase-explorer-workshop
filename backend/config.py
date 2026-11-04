"""Env var contract for the Gemini layer. Mirrors the original project's
llm/config.py, trimmed to what the workshop needs. Nothing here is an
exercise — it's plumbing.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"
DEFAULT_GENERATION_MODEL = "gemini-3.6-flash"
DEFAULT_EMBEDDING_DIM = 1536  # must match the vectors already in data/flask_embeddings.json
DEFAULT_MAX_CALLS = 500  # per-process call budget — cost control for a shared workshop key


@dataclass(frozen=True)
class GeminiConfig:
    api_key: str | None
    embedding_model: str
    generation_model: str
    embedding_dim: int
    max_calls: int

    @property
    def configured(self) -> bool:
        return bool(self.api_key)


def load_config() -> GeminiConfig:
    return GeminiConfig(
        api_key=os.environ.get("GEMINI_API_KEY") or None,
        embedding_model=os.environ.get("GEMINI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL),
        generation_model=os.environ.get("GEMINI_MODEL", DEFAULT_GENERATION_MODEL),
        embedding_dim=int(os.environ.get("GEMINI_EMBEDDING_DIM", DEFAULT_EMBEDDING_DIM)),
        max_calls=int(os.environ.get("LLM_MAX_CALLS", DEFAULT_MAX_CALLS)),
    )
