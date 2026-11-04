# How the extraction pipeline works

`data/flask_graph.json` and `data/flask_embeddings.json` didn't come from
nowhere — they're the real output of the original AI Codebase Explorer
project's extraction pipeline, run once against a real clone of
`pallets/flask`. This workshop doesn't make you run that whole pipeline
(it needs git history, a GitHub token, and a Gemini key with a much
bigger budget than a 90-minute workshop should spend), but it's worth
understanding what produced the data you're building the intelligence
layer on top of.

## The passes, in the original project

1. **Code** (`pipeline/python_indexer.py`, included here, unmodified) —
   parses every `.py` file with tree-sitter into files, classes,
   functions/methods, calls, and imports. Pass 1 is per-file only (no
   cross-file knowledge yet); a second pass (`resolve.py`, **not**
   included in this workshop repo) resolves which file an import
   actually points at and which function a call actually resolves to,
   turning raw syntax into real `CALLS`/`IMPORTS`/`DEFINES`/`INHERITS`
   edges.
2. **Git** — full commit history: every commit as a node, `MODIFIED_BY`/
   `INTRODUCED_IN` edges from files/symbols to the commits that touched
   them, rename detection (`RENAMED_TO`).
3. **GitHub** — PRs, issues, reviews, comments, discussions via the
   GitHub API: `AUTHORED_BY`, `REVIEWED_BY`, `CLOSES`, `REFERENCES`.
4. **Repo config** — `pyproject.toml`/`requirements`/CI workflows/
   CODEOWNERS parsed for `DEPENDS_ON` and `OWNS` edges.
5. **Embeddings** (Gemini) — every symbol's source, every file's docs,
   every issue/PR/comment/discussion body, chunked and embedded. This is
   `data/flask_embeddings.json` — 192 real vectors for this workshop's
   scope.
6. **Rationale** (Gemini) — extracts `Concept` nodes and `MOTIVATED_BY`/
   `DISCUSSED_IN` edges: the "why," distinguished from the verified facts
   above by `provenance.source == "llm_inference"` and a `confidence < 1.0`.

Every one of those writes `shared.schema.Node`/`Edge` objects with a
mandatory `provenance` — which pass produced it, what evidence backs it,
how confident it is. That's `data/flask_graph.json`'s shape, unchanged:
open it and look at a node or edge's `provenance` field.

## Run it yourself, on one real file

```bash
python -m scripts.extraction_demo
```

This runs pass 1 (`pipeline/python_indexer.py`) on `sample-repo/app.py` —
the real `src/flask/app.py` from the Flask repo, the same file
`Flask.wsgi_app` and `Flask.full_dispatch_request` (your Exercise 2 test
fixtures) live in — and prints exactly what it finds: every class,
function, call, and import, with line numbers. No cross-file resolution,
no git, no GitHub, no Gemini — just "what does this one file's syntax
say," which is the foundation everything else builds on.

Read `pipeline/python_indexer.py` alongside the output — it's short
(~300 lines) and the whole thing is a single tree walk: `_visit()`
dispatches on tree-sitter node type, and definitions/calls/imports get
recorded with their exact line span for evidence.

## Why this isn't in the workshop's critical path

Running the full pipeline needs: a local git clone with full history, a
GitHub token, and a Gemini key budgeted for ~8,300 embedding calls and
hundreds of rationale-extraction calls — none of that is a good use of a
90-minute window with 10-30 people sharing rate limits. Instead, this
workshop ships the **output** of a real run (`data/`) and lets you spend
the time on the four things that actually require judgment: search
ranking, traversal, retrieval fusion, and grounded answering. If you want
to run the full pipeline against a different repo later, the original
project (not included here) is the reference for `resolve.py`, the git/
GitHub passes, and the rationale extractor.
