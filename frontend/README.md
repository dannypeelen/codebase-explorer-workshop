# frontend

React + TypeScript + Vite frontend, copied unmodified from the original
AI Codebase Explorer project's `visual/` — it talks **only** to the
backend's REST contract (same endpoint shapes as the original `api`
service), so none of this needed to change when the workshop backend
swapped Postgres for an in-memory data store. Types in
`src/types/graph.ts` and `src/types/api.ts` mirror `backend/data_store.py`
and the exercise modules' return shapes, kept in sync by hand.

## Run

```
npm install
cp .env.example .env.local
npm run dev
```

Needs the workshop's `backend` running (see root README) — `uvicorn
backend.main:app --reload --port 8000` from the repo root. With no backend
reachable, the UI still loads and shows proper error states rather than a
blank page — see "Loading, empty, error states" below. As you complete
Exercises 1-4, the corresponding panels (search, graph expand/impact,
"Ask AI") go from an error state to working, live.

`VITE_API_URL` and `VITE_DEFAULT_REPO` (optional, defaults to
`pallets/flask`) are the only env vars read — Vite only exposes
`VITE_`-prefixed vars to client code, see root `.env.example`.

## Structure

```
src/
  api/            client.ts (typed fetch per endpoint), useAsync.ts (loading/error/success hook)
  domain/         taxonomy.ts (node/edge visual encoding), fileTree.ts (path -> tree)
  state/          AppState.tsx — single reducer-backed context: selection, filters,
                  layout, impact mode, path-finder target. No Redux/Zustand —
                  one screen's worth of state doesn't need external state
                  management infrastructure.
  components/
    layout/       AppShell (3-pane layout, collapsible side panels), TopBar, RightPanel
    repo-explorer/  file tree + node/edge type filters (left sidebar)
    graph-canvas/   the Cytoscape integration — see below
    inspector/      ContextInspector + six tabs (Overview/Source/Relations/
                    History/PRs & Issues/Provenance)
    ai-query/       NL question input + answer/citation rendering
    impact/         impact analysis results panel
    common/         StateViews (Loading/Empty/Error), Badge
```

## The graph canvas (`components/graph-canvas/`)

**Library: Cytoscape.js + the fcose layout extension**, driven imperatively
via a ref (not a React wrapper library) — `cytoscapeSetup.ts` creates the
instance once on mount; every other effect in `GraphCanvas.tsx` calls
methods on it directly (`cy.add`, `cy.layout(...).run()`, class toggles for
state). This is the standard, reliable pattern for integrating an
imperative canvas library with React; a wrapper component would just be
indirection around the same calls.

- **Default view**: a capped slice of `File` nodes (`/graph?node_types=File&limit=150`)
  — not an unfiltered dump of the whole graph (flask has ~8,800 nodes).
  Exploration is progressive from there: click a file in the sidebar or a
  node on canvas to pull in its real neighbors (`/subgraph?depth=1`,
  merged into the existing elements, not a replace) and center on it.
  Double-click a node, or use the right-click menu, to expand further.
- **Visual encoding** (`domain/taxonomy.ts`): every `NodeType` gets a fixed
  color *and* shape (two independent channels, not just color, per
  accessibility practice); every `EdgeType` is bucketed into one of four
  relationship categories — **structural** (CALLS/IMPORTS/DEFINES/PART_OF/
  INHERITS/DEPENDS_ON/TESTS/RENAMED_TO), **historical** (MODIFIED_BY/
  INTRODUCED_IN), **social** (AUTHORED_BY/REVIEWED_BY/OWNS/CLOSES/
  REFERENCES), **inferred** (MOTIVATED_BY/DISCUSSED_IN — the two edge
  types the Gemini rationale pass produces). Inferred edges render dashed,
  always, everywhere they appear (canvas, legend, relationship rows) — an
  LLM interpretation must never be visually indistinguishable from a
  verified fact.
- **Interaction**: click selects + ego-highlights (neighborhood lit up,
  everything else dimmed); double-click expands; right-click opens a
  context menu (expand, analyze impact, path-finding — "set as path
  start" then "find path from start to here" on a second node, which
  calls `/paths` and highlights the real returned path, not a drawn
  straight line); node/edge type filters hide/show via a CSS class
  (`.filtered-out`) and re-run layout on what's left, no refetch needed
  for types already loaded. Five layouts (force/fcose, hierarchical/
  breadthfirst, concentric, circle, grid) via a toolbar dropdown.
- **Impact analysis mode**: triggered from the inspector or context menu,
  fetches `/impact/{id}` *and* two `/subgraph` calls (the real CALLS chain
  for transitive callers, the real forward edges for dependencies) so
  every highlighted connection on canvas is a genuine edge the backend
  returned — never a synthetic line drawn to imply a relationship that
  wasn't actually traversed. Affected modules, tests, historical changes,
  and extracted design constraints are listed in the side panel (clicking
  any one focuses and connects it into the canvas on demand) rather than
  force-added to the canvas unconnected, which would visually imply a
  relationship that isn't actually drawn.

## Loading, empty, error states

Every data-fetching component goes through `useAsync` (`src/api/useAsync.ts`),
which aborts the previous in-flight request on re-trigger (no stale
responses from rapid clicking) and returns a `{status: "loading"|"error"|"success"}`
union — every consumer renders `LoadingState`/`ErrorState`/the real content
or an `EmptyState` explicitly, there's no fourth "just render nothing"
path. `/search` and `/ask` degrade specifically: a 503 (Gemini not
configured) shows as an explained error on `/search`, and `/ask` returns a
normal `200` with `degraded: true` and a plain-language explanation
instead of a crash, matching the backend's own graceful-degradation
contract.

## Validated against a real backend, not mocked data

These notes are carried over from the original project, where this UI was
built and tested against a real local Postgres + a real `uvicorn` instance
of `api`, ingested with the real `pallets/flask` code/git/github/config
graph (~10,000 nodes, ~22,000 edges) — not synthetic fixtures. The data is
the same (now pre-extracted into `data/flask_graph.json`, no Postgres
needed); the bugs below were found and fixed there, in the logic this
workshop's `backend/graph_service.py` and `backend/exercises/
graph_traversal.py` are adapted from. Driven with a headless browser
(console/network capture + screenshots), which caught two real bugs no
amount of code reading would have:

1. **`grapher.repository.get_subgraph(..., direction="both")` crashed with
   a Postgres `InvalidRecursion` error** ("recursive reference to query
   must not appear within its non-recursive term") — the SQL combined two
   separately self-referencing `SELECT`s via `UNION` inside one recursive
   term, which Postgres rejects. `direction="both"` is the default for
   every node-focus/expand interaction in this app, so this broke on the
   very first click. Fixed in `grapher/repository.py` to use a single
   self-reference with a `CASE` expression (the same pattern `find_paths`
   already used correctly). A `curl` of the exact failing URL showed a
   plain `500`; Chrome's console had reported it as a misleading "CORS
   policy" error, since a crashed response carries no CORS headers and
   Chrome can't distinguish that from a real CORS failure at the fetch API
   level — worth knowing if this pattern recurs.
2. **The initial graph-load `useEffect` got stuck on "Loading…" forever**
   under React 19 StrictMode's dev-mode mount → cleanup → mount cycle: a
   ref-based guard meant to "avoid double-fetching" treated the first
   (intentionally StrictMode-aborted) fetch as if it had completed, so the
   real second mount's fetch never ran. Fixed by removing the guard —
   the effect's dependency array already does the right thing on its own.
3. (Minor, same session) The file-tree search filter matched files but
   didn't auto-expand the folders containing them, so a search result
   could exist in the DOM yet be invisible, collapsed inside a closed
   folder. Fixed: folders in a filtered tree default to open.

Also confirmed, directly in the ingested data: this flask clone has
**multiple files with the same basename at different historical paths**
(`flask/testsuite/helpers.py`, an old pre-`src/`-layout path, alongside
today's `src/flask/helpers.py`) — exactly the git-extraction subsystem's
designed behavior (deleted/renamed paths keep their own File node, see
`extraction/git/README` notes), not a bug, but worth knowing if a search
for a common filename returns more than one hit.

Not validated: `/ask`'s actual answer quality and `/search`'s ranking
quality against a real Gemini API key (none was available in this
environment) — only the degraded-gracefully path was exercised live; the
citation-rendering and request/response wiring were verified structurally
against the backend's documented contract.

## Build

```
npm run build
```

`GraphCanvas` (and Cytoscape/fcose, its single largest dependency) is
lazy-loaded (`React.lazy` in `App.tsx`) so the shell/sidebar paint before
the ~175KB-gzipped graph engine chunk finishes loading.
