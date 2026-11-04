"""EXERCISE 3 — Hybrid retrieval.

Goal: semantic search (Exercise 1) finds code that's semantically similar
to a question. Graph traversal (Exercise 2) finds code that's
structurally connected to a given node. Neither alone is "the context an
engineer would actually want" — semantic search misses the containing
file and the discussion that explains *why* code looks the way it does;
graph traversal needs a starting point it doesn't have on its own.

Hybrid retrieval is the combination: use semantic search to find entry
points, then use graph traversal to pull in their immediate neighborhood,
so the final context includes both "this looks relevant" (semantic) and
"this is structurally attached to what's relevant" (graph) evidence.
Exercise 4's Q&A is built entirely on top of what you return here.

See exercises/03-hybrid-retrieval.md for the full walkthrough. Reference
solution: solutions/hybrid_retrieval.py.
"""

from __future__ import annotations

from .. import data_store
from ..gemini_client import GeminiClient
from . import graph_traversal, semantic_search

MAX_SEED_HITS = 5
MAX_CONTEXT_ITEMS = 25
EXPANSION_DEPTH = 1


def _text_for_node(node: dict, embedding_snippet: str | None) -> str:
    """Prebuilt — not the exercise. Prefer the matched chunk's own text
    (it's already the most relevant slice of a possibly-long node); fall
    back to a property on the node itself, then its natural_key.
    """
    if embedding_snippet:
        return embedding_snippet
    props = node.get("properties") or {}
    for key in ("body", "message", "statement", "title"):
        if props.get(key):
            return str(props[key])[:800]
    return node.get("natural_key", "")


def _reference_for_node(node: dict) -> dict:
    """Prebuilt — not the exercise. The bit of metadata Exercise 4 needs
    to turn a citation back into something a user can actually look at.
    """
    props = node.get("properties") or {}
    ref = {"node_id": node["id"], "type": node["type"], "natural_key": node["natural_key"]}
    if props.get("url"):
        ref["url"] = props["url"]
    if node["type"] == "File":
        ref["file_path"] = node["natural_key"]
    return ref


def assemble_context(
    query: str,
    client: GeminiClient | None,
    query_vector: list[float] | None = None,
) -> tuple[list[dict], dict[str, dict]]:
    """Return `(context_items, references)`:
      - `context_items`: `[{"node_id", "type", "natural_key", "text"}, ...]`
        — what gets handed to Gemini in Exercise 4.
      - `references`: `{node_id: reference_dict}` — what Exercise 4 uses
        to resolve a citation back to real metadata, and to check that
        Gemini only cited node ids that were actually in the context.

    TODO(Exercise 3): implement the pipeline.
      1. Run semantic search (`semantic_search.semantic_search`) with
         `top_k=MAX_SEED_HITS` to get the seed hits. These are your
         semantic entry points.
      2. Collect their node ids into a set `all_ids`.
      3. For each seed id, call `graph_traversal.get_subgraph(seed_id,
         depth=EXPANSION_DEPTH)` and add every node id it returns to
         `all_ids` — this is the "expand through graph relationships"
         step. Stop early if `all_ids` reaches `MAX_CONTEXT_ITEMS`.
      4. Trim `all_ids` down to `MAX_CONTEXT_ITEMS` if it's larger.
      5. Hydrate every id into a node (`data_store.get_nodes`), and for
         each one build a `context_items` entry and a `references`
         entry. For nodes that came from a seed hit, pass that hit's
         `snippet` into `_text_for_node` so the context uses the matched
         chunk, not the whole node.
    """
    raise NotImplementedError("Exercise 3: implement assemble_context")
