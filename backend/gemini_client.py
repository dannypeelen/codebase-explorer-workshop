"""Thin Gemini wrapper — adapted from the original project's
llm/gemini_client.py. This is prebuilt, not an exercise: query embedding
and answer generation are both single API calls, the interesting work
(what you do with the result) lives in backend/exercises/.

Degrades to `None` when GEMINI_API_KEY isn't set — every exercise module
must handle `client is None` rather than crash (same rule as the original
project; see api/semantic_search.py's docstring there).

A tiny in-memory cache on `embed_query`/`generate_structured` avoids
double-charging the same Gemini call if a student (or the UI) re-submits
the exact same query twice in a row — "no expensive or repeated API
calls" from the workshop brief, not a general-purpose cache.
"""

from __future__ import annotations

import time
from typing import Any, Callable, TypeVar

from pydantic import BaseModel

from .config import GeminiConfig, load_config

T = TypeVar("T", bound=BaseModel)

MAX_RETRIES = 3
_CACHE_SIZE = 64


class GeminiUnavailable(Exception):
    """Not configured, SDK missing, auth error, or retries exhausted."""


class GeminiBudgetExceeded(GeminiUnavailable):
    """LLM_MAX_CALLS reached for this process."""


def _default_raw_client(api_key: str) -> Any:
    try:
        from google import genai
    except ImportError as e:
        raise GeminiUnavailable(f"google-genai is not installed: {e}") from e
    return genai.Client(api_key=api_key)


class GeminiClient:
    def __init__(self, config: GeminiConfig, raw_client: Any = None, sleep: Callable[[float], None] = time.sleep) -> None:
        if not config.configured:
            raise GeminiUnavailable("GEMINI_API_KEY is not set")
        self.config = config
        self._raw = raw_client if raw_client is not None else _default_raw_client(config.api_key)
        self._sleep = sleep
        self.calls_made = 0
        self._embed_cache: dict[str, list[float]] = {}
        self._generate_cache: dict[tuple[str, str], Any] = {}

    def _charge_call(self) -> None:
        if self.calls_made >= self.config.max_calls:
            raise GeminiBudgetExceeded(f"LLM_MAX_CALLS={self.config.max_calls} reached")
        self.calls_made += 1

    def _with_retry(self, fn: Callable[[], Any]) -> Any:
        from google.genai import errors

        attempt = 0
        while True:
            attempt += 1
            try:
                return fn()
            except errors.ClientError as e:
                retryable = getattr(e, "code", None) == 429
                if retryable and attempt <= MAX_RETRIES:
                    self._sleep(min(2**attempt, 20))
                    continue
                raise GeminiUnavailable(f"Gemini client error (code={getattr(e, 'code', '?')}): {e}") from e
            except errors.ServerError as e:
                if attempt <= MAX_RETRIES:
                    self._sleep(min(2**attempt, 20))
                    continue
                raise GeminiUnavailable(f"Gemini server error after {attempt} attempts: {e}") from e

    def embed_query(self, text: str) -> list[float]:
        """One query -> one vector, dimensions matching data/flask_embeddings.json."""
        from google.genai import types

        if text in self._embed_cache:
            return self._embed_cache[text]
        self._charge_call()
        config = types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=self.config.embedding_dim)
        response = self._with_retry(
            lambda: self._raw.models.embed_content(model=self.config.embedding_model, contents=[text], config=config)
        )
        vector = list(response.embeddings[0].values)
        if len(self._embed_cache) >= _CACHE_SIZE:
            self._embed_cache.pop(next(iter(self._embed_cache)))
        self._embed_cache[text] = vector
        return vector

    def generate_structured(self, prompt: str, response_schema: type[T], system_instruction: str | None = None) -> T:
        from google.genai import types

        cache_key = (system_instruction or "", prompt)
        if cache_key in self._generate_cache:
            return self._generate_cache[cache_key]
        self._charge_call()
        config = types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=response_schema, system_instruction=system_instruction
        )
        response = self._with_retry(
            lambda: self._raw.models.generate_content(model=self.config.generation_model, contents=prompt, config=config)
        )
        if response.parsed is None:
            raise GeminiUnavailable("Gemini returned a response that didn't match the requested schema")
        if len(self._generate_cache) >= _CACHE_SIZE:
            self._generate_cache.pop(next(iter(self._generate_cache)))
        self._generate_cache[cache_key] = response.parsed
        return response.parsed


def try_create_client(config: GeminiConfig | None = None, raw_client: Any = None) -> GeminiClient | None:
    """Returns `None` instead of raising when Gemini isn't configured — the
    entry point every route/exercise should use so a missing key degrades
    the AI features instead of crashing graph browsing.
    """
    cfg = config or load_config()
    if not cfg.configured:
        return None
    try:
        return GeminiClient(cfg, raw_client=raw_client)
    except GeminiUnavailable:
        return None
