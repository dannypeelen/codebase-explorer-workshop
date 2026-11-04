# Limitations and what's deliberately out of scope

This is a spin-off of a larger original project, trimmed hard for a
90-minute workshop. Here's exactly what changed and why, plus stretch
challenges if you finish early.

## What's different from the original project

- **No Postgres/pgvector.** The original stores the graph and embeddings
  in Postgres with pgvector for similarity search and recursive CTEs for
  traversal. At this workshop's scale (~10k nodes, ~22k edges, 192
  embeddings — genuinely small data), that's more infrastructure than
  the four exercises need, and it's one more thing that can fail to
  install cleanly across 10-30 laptops in a live session. This repo
  loads the same real data into plain Python dicts/lists
  (`backend/data_store.py`) and you implement vector search and BFS
  traversal directly in Python. The algorithms you write are the same
  shape as the originals (see `solutions/` vs. the concepts in
  `docs/extraction-pipeline.md`) — just without a database in the loop.
- **No git/GitHub/rationale extraction passes.** Only the structural
  (tree-sitter) pass is included, and only pass 1 of that (no cross-file
  resolution) — see `docs/extraction-pipeline.md`. The *data* those
  other passes produced (commits, PRs, issues, `Concept` nodes) is still
  in `data/flask_graph.json`, pre-extracted; you're just not running the
  extractors yourself.
- **No shortest-path reconstruction exercise.** `/paths` (used by the
  UI's path-finder) is prebuilt in `backend/graph_service.py` rather than
  part of Exercise 2 — full BFS path reconstruction with multiple
  shortest-path tie-breaking is a lot of code for not much additional
  learning once you've built `get_subgraph`.
- **Embedding coverage is partial by design.** 192 real embeddings
  (110 functions/methods, 26 classes, 51 PR bodies, 5 issue bodies) —
  the subset that fit a reasonable free-tier Gemini budget when this
  data was extracted, not full coverage of all ~10,000 nodes. Semantic
  search will sometimes come back thin for an obscure query; that's
  real behavior, not a bug to route around.
- **One shared workshop key's `generate_content` quota is small**
  (20/day free tier). See the README's troubleshooting section.

## Known gaps carried over from the original

- **Call graph is static only.** `CALLS` edges come from AST analysis —
  dynamic dispatch, decorators that rewrite behavior, and
  `getattr`-based calls won't show up. Impact analysis is a lower bound
  on what could be affected, never a complete guarantee.
- **"Tests" are a path-name heuristic** (`test_*.py`, `*_test.py`, a
  `tests/` directory) — there's no verified test-to-symbol edge in the
  graph, just "a caller that lives somewhere test-shaped."

## Stretch challenges

If you finish all four exercises with time to spare:

1. **Query result caching.** `backend/gemini_client.py` already caches
   identical queries — extend it to cache `semantic_search` results
   themselves (keyed on query text + filters), and measure the latency
   difference.
2. **Weighted hybrid ranking.** Exercise 3's `assemble_context` currently
   treats every expanded node as equally relevant. Add a decayed score
   (e.g. `seed_similarity * 0.7^hop_distance`) and sort `context_items`
   by it before handing them to Gemini — does answer quality change?
3. **Multi-seed graph traversal across edge categories.** Try expanding
   Exercise 3's context using two different edge-type sets per seed
   (e.g. structural *and* historical) and compare what Exercise 4
   answers with each.
4. **Implement `find_paths` as an exercise.** `backend/graph_service.py`'s
   version is complete — delete it and rebuild it yourself using the BFS
   skills from Exercise 2 (hint: you need parent pointers, not just a
   visited set, to reconstruct the path afterward).
5. **Run the real extraction pipeline on a different small repo.** The
   original project's `extraction/` (not included here) is the
   reference; `pipeline/python_indexer.py` here is pass 1 of it.
