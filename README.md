# Codebase Explorer — Build Night

A 90-minute, follow-along workshop: you'll implement the four features
that make an AI-powered codebase explorer actually intelligent — Gemini
semantic search, graph traversal, hybrid retrieval, and grounded Q&A —
against a real, already-ingested copy of [`pallets/flask`](https://github.com/pallets/flask)
(~10,000 real nodes, ~22,000 real edges, 192 real Gemini embeddings).
Everything else — the extraction pipeline that produced that data, the
FastAPI scaffolding, and the full React graph-visualization frontend —
is already built. You're filling in the intelligence layer, not the
plumbing.

This is a spin-off of a larger original project; see
[LIMITATIONS.md](./LIMITATIONS.md) for exactly what's trimmed and why.

## What you'll build

| # | Exercise | File you edit | Unlocks |
|---|---|---|---|
| 1 | Gemini semantic search | `backend/exercises/semantic_search.py` | `/search`, the search box |
| 2 | Graph traversal | `backend/exercises/graph_traversal.py` | `/subgraph`, `/nodes/{id}/neighbors`, `/impact/{id}`, node expand/impact on canvas |
| 3 | Hybrid retrieval | `backend/exercises/hybrid_retrieval.py` | the context behind Exercise 4's answers |
| 4 | Gemini Q&A | `backend/exercises/qa.py` | `/ask`, the "Ask AI" panel |

Each file has `TODO` markers with the exact steps. A full walkthrough for
each is in `exercises/01-...md` through `04-...md`. A complete reference
implementation is in `solutions/` — if you get stuck, read it, or run
`python -m scripts.apply_solutions <N>` to drop it in and move on.

## Setup (10 minutes)

**Requirements**: Python 3.11+, Node 20+, a free [Gemini API key](https://aistudio.google.com/app/apikey).

```bash
# 1. Python backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env, set GEMINI_API_KEY=... (or skip it — see "No API key?" below)

# 2. Frontend
cd frontend && npm install && cp .env.example .env.local && cd ..

# 3. Run both (two terminals)
uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

Open `http://localhost:5173`. You should see the Flask dependency graph
render immediately — that part doesn't need any exercise finished.
Search and "Ask AI" will show a clear "not implemented" error until you
get to Exercises 1 and 4; that's expected, not broken.

**Checkpoint**: `python -m scripts.check` — runs all four exercises
against a cached demo query (no API key needed) and prints PASS/FAIL per
exercise. Run it again after each exercise.

### No API key?

Exercises 2 (graph traversal) and the whole frontend graph/impact/path UI
work with zero Gemini setup. For Exercises 1/3/4, every test and the
checkpoint script use a **cached, pre-computed query embedding**
(`data/demo_queries.json`) instead of a live call by default — you can
implement and verify all four exercises offline. A key is only needed to
try your own free-text questions in the running UI.

### Got a key? Two things to know

- **Free tier is tight on `generate_content`** (Exercise 4's answer
  generation): ~5 requests/minute, **20/day**, shared across everyone
  using that key. `embed_content` (Exercise 1's query embedding) is much
  more generous (~100/min) — search freely, budget your "Ask AI"
  questions. Hitting the daily cap produces a clean, readable degraded
  answer, not a crash — that's the whole point of Exercise 4's error
  handling, so if you see one, you've actually verified it's working.
- **Gemini model names move.** If `GEMINI_MODEL` in `.env` 404s, check
  <https://ai.google.dev/gemini-api/docs/models> for the current name and
  update the env var — no code change needed.

## Workshop flow (~90 min)

See [exercises/00-overview.md](./exercises/00-overview.md) for the full
sequence and timing; [FACILITATOR.md](./FACILITATOR.md) if you're
running this for a group.

## Project layout

| Path | What | Prebuilt or exercise? |
|---|---|---|
| `data/` | Real pre-extracted `pallets/flask` graph + embeddings | prebuilt (real data) |
| `backend/data_store.py`, `gemini_client.py`, `graph_service.py`, `main.py`, `config.py`, `validation.py` | Data loading, Gemini wrapper, composition layer, FastAPI routes | prebuilt |
| `backend/exercises/` | The four things you implement | **exercises** |
| `backend/tests/` | Checkpoint tests per exercise (`pytest backend/tests -v`) | prebuilt |
| `solutions/` | Full reference implementation of all four exercises | reference |
| `pipeline/`, `sample-repo/`, `scripts/extraction_demo.py` | A real, runnable example of how the structural extraction pass works | prebuilt, for context |
| `frontend/` | The React graph visualization + search/Q&A UI, unmodified from the original project | prebuilt |
| `exercises/*.md` | Workshop guides, one per exercise | docs |

## Troubleshooting

- **`ModuleNotFoundError` running anything in `backend/`**: run commands
  from the repo root with the venv active, e.g. `python -m scripts.check`,
  not `python backend/exercises/semantic_search.py` or `cd backend && ...`.
- **Frontend shows "Could not reach the context graph API"**: the backend
  isn't running, or it's on a different port than `frontend/.env.local`'s
  `VITE_API_URL`. Default is `http://localhost:8000`.
- **`npm install`/`npm run build` fails with a `rolldown` / `@rolldown/binding-*`
  "Cannot find module" error**: you likely have more than one Node
  install on `PATH` and npm resolved a mismatched one. Run `node -v`
  (want 20+), and if you use `nvm`, run `nvm use` in this directory and
  reinstall (`rm -rf node_modules && npm install`).
- **`/search` or `/ask` returns a 503 / "Gemini is not configured"**: you
  haven't set `GEMINI_API_KEY` in `.env` (backend) — or you have, but
  forgot to restart `uvicorn` after editing it.
- **`/ask` returns `"degraded": true` with a quota message**: you've hit
  the free tier's 20/day `generate_content` cap (see above). Wait for the
  reset, use a different key, or keep developing with `scripts/check.py`'s
  offline mode / the `FakeGeminiClient` pattern in `backend/tests/test_qa.py`.
- **A test fails with `NotImplementedError: Exercise N.M: ...`**: that's
  the expected state before you've written that part — not a bug.
