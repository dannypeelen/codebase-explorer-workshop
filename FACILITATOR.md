# Facilitator Guide

Running this for a group of 10-30. You don't need to have memorized the
whole codebase — you need the talking points below and a demo environment
that already works, so if something breaks for a participant, you have a
known-good reference to compare against.

## Before the session

1. Clone fresh, follow the README yourself, start to finish, on a clean
   machine or container if you can — this catches environment issues
   before 20 people hit them simultaneously.
2. Get your own Gemini API key, and **separately**, decide whether
   participants bring their own keys or share one. Bringing their own is
   strongly preferred: the free tier's `generate_content` cap is
   **20 requests/day, shared per key** — one shared key across 20+
   people asking even 2-3 questions each will exhaust it in the first
   ten minutes of Exercise 4.
3. Run `python -m scripts.apply_solutions` in a **second clone** (not the
   one you'll share your screen from) so you have a fully working
   reference to diff against or demo from if live-coding goes sideways.
   Keep your main clone on the TODO stubs for the actual walkthrough.
4. Decide your fallback for Exercise 4 demos: if you expect to burn
   through quota live, pre-run a couple of good example questions and
   have the terminal output or a screenshot ready.

## Timing and talking points

### 0–10 min — Intro + demo

Open the fully-solved reference (or `scripts/apply_solutions` your own
checkout live, which also doubles as "look, it's really just these four
files"). Show, in order: the graph rendering, clicking a node and
expanding it, a semantic search, an "Ask AI" question with citations you
click through to verify. **Say explicitly**: "everything you just saw
except the four highlighted files already exists — you're building the
intelligence, not the plumbing."

### 10–20 min — Architecture + extraction

Walk through `exercises/00-overview.md`'s diagram. Run
`python -m scripts.extraction_demo` live and point at the output next to
`pipeline/python_indexer.py` — this is the one part of the demo that
needs no setup and makes "where did this graph come from" concrete
without a 20-minute detour into git/GitHub ingestion.

**Good framing**: "This workshop's data is real — not a toy fixture.
`pallets/flask` is a real, popular open-source project. When your
Exercise 2 test asserts `Flask.wsgi_app` calls exactly three things,
that's not an arbitrary number someone picked — go look at the real
source in `sample-repo/app.py`."

### 20–80 min — Exercises 1-4

Have people work at their own pace through `exercises/01-...md` through
`04-...md`; circulate rather than lecture through each one. The
`pytest`/`scripts/check.py` checkpoints mean you can glance at a
terminal and know someone's status without asking.

**Common stuck points** (see also README's troubleshooting):
- Exercise 1: forgetting to dedupe before truncating to `top_k` (people
  often truncate first, then dedupe, which can under-fill results).
- Exercise 2: direction confusion — `rel_direction` should be computed
  from which side of the **edge** the current node is on, not assumed
  from the `direction` parameter (a `direction="both"` call still needs
  to report each edge's real direction).
- Exercise 3: forgetting to pass `query_vector` through to the
  semantic_search call inside `assemble_context` — breaks the offline
  tests even if the logic is otherwise right.
- Exercise 4: catching `GeminiUnavailable` in the wrong place (should
  wrap the `assemble_context` and `generate_structured` calls
  specifically, not the whole function body, so the `client is None`
  check still runs first).

### 80–90 min — Final demo + exploration

Let people ask real questions against the running app. Good demo
questions that showcase each layer:

- *"How does Flask handle incoming HTTP requests?"* — semantic search
  should surface `Flask.wsgi_app`/`full_dispatch_request`.
- *"What calls `Flask.full_dispatch_request`?"* — graph traversal /
  impact analysis.
- *"What might break if I modify `Flask.wsgi_app`?"* — impact analysis's
  transitive callers + affected modules.
- *"What's Flask's stance on async support?"* — tests whether Q&A
  correctly says `unable_to_answer` when the indexed embeddings (only
  192, see LIMITATIONS.md) don't actually cover that topic, rather than
  guessing. A good answer here demonstrates the citation-validation
  worked, not that the model never gets this question — if it does
  answer, check whether the citations actually back it up.

Point at [LIMITATIONS.md](./LIMITATIONS.md)'s stretch challenges for
anyone done early.

## Troubleshooting beyond the README

- **A participant's graph never renders**: check the browser console for
  a CORS error first — usually `VISUAL_ORIGIN` in their backend `.env`
  doesn't match the port Vite actually started on (if `5173` was taken,
  Vite auto-increments).
- **Someone's tests pass locally but `scripts.check` fails**: almost
  always a stale `uvicorn --reload` process holding an old import of a
  module that's since been edited — have them Ctrl-C and restart it;
  `scripts/check.py` itself doesn't need the server running at all
  (it calls the exercise functions in-process), so if it still fails,
  the bug is real.
- **Everyone's `generate_content` calls start 429ing around the same
  time**: expected if sharing a key — see the quota numbers above. Not a
  bug, switch that room to the offline/cached-vector path
  (`python -m scripts.check`, no `--live`) for the rest of the session
  and demo Exercise 4 from your own pre-verified key.
