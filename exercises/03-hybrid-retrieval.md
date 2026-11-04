# Exercise 3 — Hybrid Retrieval

**File**: `backend/exercises/hybrid_retrieval.py` · **Tests**: `pytest backend/tests/test_hybrid_retrieval.py -v`
**Time**: ~20 minutes · **Requires**: Exercises 1 and 2 done

## The concept

Neither of the first two exercises, alone, gives an LLM what it needs to
answer a real question.

- Semantic search (Exercise 1) finds *some* relevant code, but misses
  the stuff that's structurally attached to it — the file it lives in,
  the PR that explains why it looks the way it does.
- Graph traversal (Exercise 2) finds structurally connected code, but
  needs a starting point — it has no idea what's relevant to a given
  question on its own.

**Hybrid retrieval** is the fix: use semantic search to find entry
points ("this looks relevant to the question"), then use graph
traversal to pull in each entry point's immediate neighborhood ("and
here's what's structurally attached to it"). This is the same pattern
real production RAG (retrieval-augmented generation) systems use —
vector search for "aboutness," graph/structural expansion for
completeness.

## What's already there

- `_text_for_node` / `_reference_for_node` — turning a hydrated node into
  prompt text and into citation metadata. Not interesting on their own;
  the orchestration that calls them is.
- `MAX_SEED_HITS`, `MAX_CONTEXT_ITEMS`, `EXPANSION_DEPTH` — the knobs.

## What you implement

**`assemble_context(query, client, query_vector=None)`** — the whole
pipeline:

1. Run `semantic_search.semantic_search(...)` with `top_k=MAX_SEED_HITS`
   — these are your entry points.
2. Collect their node ids.
3. For each one, call `graph_traversal.get_subgraph(seed_id,
   depth=EXPANSION_DEPTH)` and fold every id it returns into your running
   set — this is the graph-expansion step. Stop early once you hit
   `MAX_CONTEXT_ITEMS`.
4. Trim to `MAX_CONTEXT_ITEMS` if you went over.
5. Hydrate every id into a node, and build the two things Exercise 4
   needs: a `context_items` list (what gets shown to Gemini) and a
   `references` dict (what a citation resolves back to).

## Try it

```bash
pytest backend/tests/test_hybrid_retrieval.py -v
python -m scripts.check --exercise 3
```

There's no UI surface for this exercise directly — it's plumbing between
Exercise 1/2 and Exercise 4. You'll see it working once Exercise 4's
answers include evidence that wasn't a direct semantic hit (e.g. the
containing file, or a method `DEFINES`-related to a matched class).

## Checkpoint

- [ ] `pytest backend/tests/test_hybrid_retrieval.py -v` — all pass
- [ ] `python -m scripts.check --exercise 3` — PASS, and reports more
      context items than the raw semantic search alone would return

Stuck? `solutions/hybrid_retrieval.py`, or `python -m scripts.apply_solutions 3`.

Next: [04-qa.md](./04-qa.md)
