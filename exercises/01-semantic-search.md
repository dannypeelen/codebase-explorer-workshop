# Exercise 1 — Gemini Semantic Search

**File**: `backend/exercises/semantic_search.py` · **Tests**: `pytest backend/tests/test_semantic_search.py -v`
**Time**: ~15 minutes

## The concept

Keyword search finds code containing the words you typed. Semantic
search finds code that *means* the same thing, even with zero words in
common — searching "how does Flask handle incoming HTTP requests" should
surface `Flask.wsgi_app` and `Flask.full_dispatch_request`, even though
neither string appears in your query.

The trick: an embedding model turns text into a vector (a list of
numbers) such that semantically similar text produces nearby vectors.
Every function, class, issue, and PR body in `pallets/flask` was already
run through Gemini's embedding model and the result stored in
`data/flask_embeddings.json` (192 real vectors, 1536 dimensions each —
see `backend/data_store.py`). To search, you embed the *query* the same
way, then find which stored vectors are closest to it.

"Closest" = **cosine similarity**: the cosine of the angle between two
vectors, 1.0 for identical direction, 0 for unrelated, -1 for opposite.
It's dot product divided by the product of magnitudes:

```
cosine_similarity(a, b) = (a · b) / (‖a‖ · ‖b‖)
```

## What's already there

- `data_store.EMBEDDINGS` — every stored vector, with its node id, source
  type, and the chunk of text it was computed from.
- `SOURCE_TYPES_BY_NODE_TYPE` — if you want to restrict a search to, say,
  only `Function`s, this maps that to the underlying `source_type` values.
- The result-hydration step at the bottom of `semantic_search()` — turning
  a matched embedding row into a result dict with `node_id`, `type`,
  `natural_key`, etc. Already written.

## What you implement

**1.1 — `cosine_similarity(a, b)`**: the formula above. No imports beyond
`math.sqrt`.

**1.2 — embedding the query**: when no `query_vector` is passed in,
call `client.embed_query(query)` to get one from Gemini.

**1.3 — score every embedding**: loop over `data_store.EMBEDDINGS`
(skipping any that don't match `source_types`, when set), and compute
each one's `cosine_similarity` against the query vector.

**1.4 — dedupe and rank**: a node with a long source body can have
*several* embedded chunks (see `EMBEDDINGS_BY_NODE` — four Flask nodes
do). Collapse to one entry per `node_id`, keeping its best-scoring chunk,
then sort by similarity descending and keep the top `top_k`.

## Try it

```bash
pytest backend/tests/test_semantic_search.py -v
python -m scripts.check --exercise 1
```

Then, with the backend running and a Gemini key set, type into the
search box in the UI:

> How does Flask handle incoming HTTP requests?

You should see `Flask` (the class) and request-handling methods near the
top — real semantic matches, not string matches.

## Checkpoint

- [ ] `pytest backend/tests/test_semantic_search.py -v` — all pass
- [ ] `python -m scripts.check --exercise 1` — PASS
- [ ] The search box in the UI returns results for a natural-language query

Stuck? `solutions/semantic_search.py` has the full implementation, or run
`python -m scripts.apply_solutions 1`.

Next: [02-graph-traversal.md](./02-graph-traversal.md)
