# Exercise 2 — Graph Traversal

**File**: `backend/exercises/graph_traversal.py` · **Tests**: `pytest backend/tests/test_graph_traversal.py -v`
**Time**: ~15 minutes

## The concept

Semantic search tells you "this code is relevant." It says nothing about
"what else connects to it" — what calls it, what it calls, what file
it's part of, what tests exercise it. That's a graph question, not a
similarity question, and it needs a different tool: traversal.

The graph is simple: **nodes** (a `Function`, a `File`, a `Commit`, ...)
and **edges** (`CALLS`, `IMPORTS`, `PART_OF`, ...), each edge pointing
from a source node to a destination node. `backend/data_store.py` has
already loaded all ~10,000 real nodes and ~22,000 real edges from
`pallets/flask` into memory, and indexed them two ways for O(1) one-hop
lookups:

- `OUT_EDGES[node_id]` — edges where this node is the source
- `IN_EDGES[node_id]` — edges where this node is the destination

You're building two things on top of that index:

1. **`get_neighbors`** — one hop. "What's directly connected to this
   node?"
2. **`get_subgraph`** — breadth-first search (BFS). "What's reachable
   within N hops?" This is the same algorithm as `get_neighbors` run
   repeatedly, tracking what's already been visited so you don't revisit
   nodes or loop forever on a cycle (and Flask's call graph has plenty —
   methods calling each other back and forth).

## What's already there

- `_candidate_edges(node_id, direction)` — returns the right edge list
  for `"out"`, `"in"`, or `"both"`. You don't need to touch this.
- `data_store.get_node(id)` / `get_nodes(ids)` / `get_edges_among(ids)` —
  hydrating ids into full node/edge dicts.

## What you implement

**2.1 — `get_neighbors`**: for each candidate edge (filtered by
`edge_types` if given), find the node on the *other* end, filter it by
`node_types` if given, and build a result dict. Watch the direction: if
`node_id` is the edge's `src_id`, the relationship is `"out"` and the
neighbor is the `dst_id` — and vice versa.

**2.2 — `get_subgraph`**: classic BFS. Keep a `visited` set seeded with
your starting node(s), and a `frontier` (the nodes to expand this
round). For up to `depth` rounds: look at every candidate edge from
every node in the frontier, and any neighbor not already visited becomes
part of the next frontier. Stop early if the frontier runs dry. At the
end, hydrate `visited` into real nodes and find the edges among them.

## Try it

```bash
pytest backend/tests/test_graph_traversal.py -v
python -m scripts.check --exercise 2
```

In the UI: click a node (try searching the file tree for `app.py`, then
a method like `wsgi_app`), then expand it or right-click → "Analyze
Impact." Both now return real data instead of an error.

## Checkpoint

- [ ] `pytest backend/tests/test_graph_traversal.py -v` — all pass
- [ ] `python -m scripts.check --exercise 2` — PASS
- [ ] Clicking "expand" on a node in the UI pulls in its real neighbors
- [ ] The Impact Analysis panel works on a function/method node

Stuck? `solutions/graph_traversal.py`, or `python -m scripts.apply_solutions 2`.

Next: [03-hybrid-retrieval.md](./03-hybrid-retrieval.md)
