# Overview

## The architecture

```
data/flask_graph.json ──┐
data/flask_embeddings.json ──┤
                              ▼
                    backend/data_store.py  (prebuilt: loads everything into memory)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                    ▼
  exercises/            exercises/            backend/graph_service.py
  semantic_search.py    graph_traversal.py    (prebuilt — composes graph_traversal
  (Exercise 1)           (Exercise 2)          into /subgraph, /impact, etc.)
          │                   │
          └─────────┬─────────┘
                     ▼
          exercises/hybrid_retrieval.py   (Exercise 3 — combines 1 + 2)
                     │
                     ▼
          exercises/qa.py                 (Exercise 4 — builds on 3)
                     │
                     ▼
          backend/main.py (prebuilt FastAPI routes) ──REST──▶ frontend/ (prebuilt React UI)
```

Each exercise builds on the last. Exercise 3 calls into Exercises 1 and
2's modules directly; Exercise 4 calls into Exercise 3's. That's not
incidental — it's the real shape of retrieval-augmented systems: semantic
search finds candidates, graph traversal supplies structural context,
and the two together are what you actually hand an LLM.

## Timing

| Time | Activity |
|---|---|
| 0–10 min | Intro + demo of the finished app |
| 10–20 min | This architecture, `data/`, and `scripts/extraction_demo.py` |
| 20–35 min | **Exercise 1** — semantic search |
| 35–50 min | **Exercise 2** — graph traversal |
| 50–70 min | **Exercise 3** — hybrid retrieval |
| 70–80 min | **Exercise 4** — codebase Q&A |
| 80–90 min | Final demo, free exploration, stretch challenges |

Each exercise's doc has its own checkpoint — don't wait until the end to
find out something's broken.

## Before you start

1. Finish [setup](../README.md#setup-10-minutes) — you should have the
   graph rendering at `http://localhost:5173` and `python -m scripts.check`
   running (everything will say "not implemented yet," that's correct).
2. Skim [docs/extraction-pipeline.md](../docs/extraction-pipeline.md) and
   run `python -m scripts.extraction_demo` — this is where `data/flask_graph.json`
   actually came from, and seeing it run on one real file makes the rest
   of the graph less of a black box.
3. Start with [01-semantic-search.md](./01-semantic-search.md).
