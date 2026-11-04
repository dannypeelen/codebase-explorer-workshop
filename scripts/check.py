#!/usr/bin/env python3
"""Checkpoint runner — a quick, human-readable progress check across all
four exercises without needing pytest or a running server. Good for a
student sanity-checking their own progress, or a facilitator glancing
across the room's status.

    python -m scripts.check            # offline, uses a cached demo query vector
    python -m scripts.check --live     # also makes one real Gemini call per stage
    python -m scripts.check --exercise 2

Exit code is 0 only if every exercise prints PASS.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO_QUERY = "How does Flask handle incoming HTTP requests?"


def _demo_vector() -> list[float]:
    with open(ROOT / "data" / "demo_queries.json") as f:
        demo = json.load(f)
    match = next(d for d in demo if d["query"] == DEMO_QUERY)
    return match["vector"]


def _status(label: str, fn) -> bool:
    try:
        fn()
    except NotImplementedError as e:
        print(f"  [ ] {label}: not implemented yet ({e})")
        return False
    except Exception as e:  # noqa: BLE001 — this is a diagnostic tool, show whatever broke
        print(f"  [FAIL] {label}: {type(e).__name__}: {e}")
        return False
    print(f"  [PASS] {label}")
    return True


def check_exercise_1(client, query_vector) -> bool:
    from backend.exercises.semantic_search import semantic_search

    def run():
        results = semantic_search(DEMO_QUERY, client, top_k=5, query_vector=query_vector)
        assert results, "expected at least one search result"
        assert len({r["node_id"] for r in results}) == len(results), "results should be deduped by node"
        print(f"      top hit: {results[0]['type']} {results[0]['natural_key']} (similarity={results[0]['similarity']:.3f})")

    return _status("Exercise 1 — semantic search", run)


def check_exercise_2() -> bool:
    from backend.exercises.graph_traversal import get_neighbors, get_subgraph

    wsgi_app_id = "b0ba0cc27b2a53574e62b2409e67388b"

    def run():
        neighbors = get_neighbors(wsgi_app_id, edge_types=["CALLS"], direction="out")
        assert len(neighbors) == 3, f"expected 3 CALLS neighbors, got {len(neighbors)}"
        subgraph = get_subgraph(wsgi_app_id, depth=1, edge_types=["CALLS"], direction="out")
        assert len(subgraph["nodes"]) == 4, f"expected 4 nodes (seed + 3 callees), got {len(subgraph['nodes'])}"
        print(f"      Flask.wsgi_app calls: {', '.join(n['natural_key'].split('::')[-1] for n in neighbors)}")

    return _status("Exercise 2 — graph traversal", run)


def check_exercise_3(client, query_vector) -> bool:
    from backend.exercises.hybrid_retrieval import assemble_context

    def run():
        context_items, references = assemble_context(DEMO_QUERY, client, query_vector=query_vector)
        assert context_items, "expected at least one context item"
        assert len(context_items) == len(references)
        print(f"      assembled {len(context_items)} context items")

    return _status("Exercise 3 — hybrid retrieval", run)


def check_exercise_4(client, query_vector, live: bool) -> bool:
    from backend.exercises.qa import answer_question

    def run():
        if live:
            result = answer_question(DEMO_QUERY, client)
        else:
            from backend.tests.test_qa import FakeGeminiClient
            from backend.exercises.qa import AnsweredQuestion, Citation
            from backend.exercises.hybrid_retrieval import assemble_context

            context_items, _ = assemble_context(DEMO_QUERY, client, query_vector=query_vector)
            seed = context_items[0]
            fake = FakeGeminiClient(AnsweredQuestion(
                answer="A canned answer for offline checking.",
                citations=[Citation(node_id=seed["node_id"], quote=seed["text"][:30].strip())],
            ))
            result = answer_question(DEMO_QUERY, fake, query_vector=query_vector)

        assert "answer" in result and "citations" in result
        assert result["dropped_citations"] == 0, "the one citation handed in should have validated clean"
        print(f"      answer: {result['answer'][:80]!r}")

    return _status("Exercise 4 — codebase Q&A", run)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="make real Gemini calls instead of using a cached query vector")
    parser.add_argument("--exercise", type=int, choices=[1, 2, 3, 4], help="check only this exercise")
    args = parser.parse_args()

    sys.path.insert(0, str(ROOT))
    from backend.gemini_client import try_create_client

    client = try_create_client() if args.live else None
    query_vector = None if args.live else _demo_vector()

    print(f"Demo query: {DEMO_QUERY!r}\n")
    results = []
    if args.exercise in (None, 1):
        results.append(check_exercise_1(client, query_vector))
    if args.exercise in (None, 2):
        results.append(check_exercise_2())
    if args.exercise in (None, 3):
        results.append(check_exercise_3(client, query_vector))
    if args.exercise in (None, 4):
        results.append(check_exercise_4(client, query_vector, args.live))

    print()
    if all(results):
        print("All checked exercises pass.")
        return 0
    print("Some exercises aren't done yet — see exercises/ for the walkthrough, solutions/ for the reference.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
