import type { Core, EventObject, NodeSingular } from "cytoscape";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { useAppState, type LayoutName } from "../../state/AppState";
import { createCytoscape, mergeElements } from "./cytoscapeSetup";
import { toEdgeElement, toNodeElement, layoutOptions } from "./elements";
import { applyEgoHighlight, applyImpactHighlight, applyPathHighlight, clearAllHighlights } from "./highlight";
import { CanvasToolbar } from "./CanvasToolbar";
import { Legend } from "./Legend";
import { NodeContextMenu, type ContextMenuState } from "./NodeContextMenu";
import { ErrorState, LoadingState } from "../common/StateViews";
import styles from "./GraphCanvas.module.css";

const INITIAL_NODE_LIMIT = 150;
const DEPENDENCY_EDGE_TYPES = ["CALLS", "IMPORTS", "DEPENDS_ON", "INHERITS"] as const;

export function GraphCanvas() {
  const { state, selectNode, dispatch } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [initialLoad, setInitialLoad] = useState<"loading" | "error" | "ready">("loading");
  const [retryTick, setRetryTick] = useState(0);
  const [initialError, setInitialError] = useState<Error | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pathAnchorId, setPathAnchorId] = useState<string | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  // --- mount: create the cytoscape instance once ---
  useEffect(() => {
    if (!containerRef.current) return;
    const cy = createCytoscape(containerRef.current);
    cyRef.current = cy;

    cy.on("tap", "node", (evt: EventObject) => {
      const id = (evt.target as NodeSingular).id();
      selectNode(id);
      applyEgoHighlight(cy, id);
      setContextMenu(null);
    });
    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        selectNode(null);
        clearAllHighlights(cy);
        setContextMenu(null);
      }
    });
    cy.on("dbltap", "node", (evt: EventObject) => {
      const node = evt.target as NodeSingular;
      void expandNode(cy, node.id());
    });
    cy.on("cxttap", "node", (evt: EventObject) => {
      const node = evt.target as NodeSingular;
      const pos = node.renderedPosition();
      const containerRect = containerRef.current?.getBoundingClientRect();
      setContextMenu({
        nodeId: node.id(),
        label: `${node.data("nodeType")} · ${node.data("naturalKey")}`,
        x: (containerRect?.left ?? 0) + pos.x,
        y: (containerRect?.top ?? 0) + pos.y,
      });
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- initial data load per repo: a File-centric default slice ---
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    setInitialLoad("loading");
    const controller = new AbortController();
    api
      .getGraph({ repo: state.repo, nodeTypes: ["File"], limit: INITIAL_NODE_LIMIT, signal: controller.signal })
      .then((data) => {
        cy.elements().remove();
        cy.add(data.nodes.map(toNodeElement));
        cy.add(data.edges.map(toEdgeElement));
        setTruncated(data.truncated);
        runLayout(cy, state.layout);
        setInitialLoad("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setInitialError(err instanceof Error ? err : new Error(String(err)));
        setInitialLoad("error");
      });

    // Deliberately no `loadedRepoRef`-style guard here: this effect's only
    // dependency is `state.repo`, so it already only re-runs when the repo
    // actually changes. An earlier version added a ref guard to "avoid
    // double-fetching" — but React 19 StrictMode's dev-mode mount → cleanup
    // → mount cycle aborts the first (intentionally-discarded) fetch, and a
    // stale guard then skipped the second, *real* mount's fetch entirely,
    // leaving the canvas stuck on "Loading…" forever. Found by actually
    // loading the page in a browser, not by reading the code.
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.repo, retryTick]);

  // --- type filters: show/hide + re-layout ---
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || initialLoad !== "ready") return;
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const visible = state.visibleNodeTypes.has(n.data("nodeType"));
        n.toggleClass("filtered-out", !visible);
      });
      cy.edges().forEach((e) => {
        const typeVisible = state.visibleEdgeTypes.has(e.data("edgeType"));
        const endpointsVisible = !e.source().hasClass("filtered-out") && !e.target().hasClass("filtered-out");
        e.toggleClass("filtered-out", !typeVisible || !endpointsVisible);
      });
    });
    runLayout(cy, state.layout, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.visibleNodeTypes, state.visibleEdgeTypes, initialLoad]);

  // --- layout changes ---
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || initialLoad !== "ready") return;
    runLayout(cy, state.layout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.layout]);

  // --- focus a node (from file tree / search / citation clicks): ensure
  // it's loaded, pull in its neighbors, center the viewport on it ---
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !state.focusNodeId || initialLoad !== "ready") return;
    const id = state.focusNodeId;
    let cancelled = false;

    (async () => {
      if (cy.getElementById(id).empty()) {
        try {
          const sub = await api.getSubgraph({ nodeId: id, depth: 1, direction: "both" });
          if (cancelled) return;
          mergeElements(cy, sub.nodes.map(toNodeElement));
          mergeElements(cy, sub.edges.map(toEdgeElement));
        } catch {
          return; // node genuinely doesn't exist or API hiccup — nothing to focus on
        }
      }
      const node = cy.getElementById(id);
      if (node.empty() || cancelled) return;
      applyEgoHighlight(cy, id);
      runLayout(cy, state.layout);
      cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.1) }, { duration: 350 });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.focusNodeId]);

  // --- impact analysis mode ---
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || initialLoad !== "ready") return;
    if (!state.impactNodeId) {
      clearAllHighlights(cy);
      return;
    }
    const id = state.impactNodeId;
    let cancelled = false;
    setImpactLoading(true);

    (async () => {
      try {
        const [impact, callerGraph, depGraph] = await Promise.all([
          api.getImpact(id, { maxDepth: 3 }),
          api.getSubgraph({ nodeId: id, depth: 3, edgeTypes: ["CALLS"], direction: "in" }),
          api.getSubgraph({ nodeId: id, depth: 1, edgeTypes: [...DEPENDENCY_EDGE_TYPES], direction: "out" }),
        ]);
        if (cancelled) return;
        mergeElements(cy, callerGraph.nodes.map(toNodeElement));
        mergeElements(cy, callerGraph.edges.map(toEdgeElement));
        mergeElements(cy, depGraph.nodes.map(toNodeElement));
        mergeElements(cy, depGraph.edges.map(toEdgeElement));
        runLayout(cy, state.layout);
        applyImpactHighlight(cy, impact);
        const node = cy.getElementById(id);
        if (!node.empty()) cy.animate({ center: { eles: node } }, { duration: 300 });
      } finally {
        if (!cancelled) setImpactLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.impactNodeId]);

  // --- path finder result ---
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !state.pathTarget || initialLoad !== "ready") return;
    let cancelled = false;

    (async () => {
      const result = await api.getPaths({ fromId: state.pathTarget!.fromId, toId: state.pathTarget!.toId, limit: 1 });
      if (cancelled || result.paths.length === 0) return;
      const path = result.paths[0];
      mergeElements(cy, path.nodes.map(toNodeElement));
      mergeElements(cy, path.edges.map(toEdgeElement));
      runLayout(cy, state.layout);
      applyPathHighlight(
        cy,
        path.nodes.map((n) => n.id),
        path.edges.map((e) => e.id),
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pathTarget]);

  async function expandNode(cy: Core, nodeId: string) {
    const sub = await api.getSubgraph({ nodeId, depth: 1, direction: "both" });
    const added = mergeElements(cy, sub.nodes.map(toNodeElement)) + mergeElements(cy, sub.edges.map(toEdgeElement));
    if (added > 0) runLayout(cy, state.layout);
  }

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.canvas} />

      {initialLoad === "loading" && (
        <div className={styles.overlayCenter}>
          <LoadingState label="Loading repository graph…" />
        </div>
      )}
      {initialLoad === "error" && initialError && (
        <div className={styles.overlayCenter}>
          <ErrorState error={initialError} onRetry={() => setRetryTick((t) => t + 1)} />
        </div>
      )}

      {initialLoad === "ready" && (
        <>
          <CanvasToolbar
            onZoomIn={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)}
            onZoomOut={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.3)}
            onFit={() => cyRef.current?.fit(undefined, 40)}
            onToggleLegend={() => setLegendOpen((v) => !v)}
            legendOpen={legendOpen}
          />
          {legendOpen && <Legend />}
          <div className={styles.hint}>
            Double-click a node to expand · right-click for more actions
            {truncated && <span className={styles.hintWarn}> · showing a capped slice of the graph</span>}
          </div>
          {impactLoading && (
            <div className={styles.impactBadge}>
              <LoadingState label="Analyzing impact…" />
            </div>
          )}
          {pathAnchorId && (
            <div className={styles.pathBadge}>
              Path start set — right-click another node and choose "Find path from start to here"
              <button type="button" onClick={() => setPathAnchorId(null)}>
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          hasPathAnchor={pathAnchorId !== null}
          onExpand={() => {
            const cy = cyRef.current;
            if (cy) void expandNode(cy, contextMenu.nodeId);
          }}
          onAnalyzeImpact={() => dispatch({ type: "START_IMPACT", nodeId: contextMenu.nodeId })}
          onSetPathStart={() => setPathAnchorId(contextMenu.nodeId)}
          onFindPathHere={() => {
            if (pathAnchorId) {
              dispatch({ type: "SET_PATH_TARGET", fromId: pathAnchorId, toId: contextMenu.nodeId });
              setPathAnchorId(null);
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function runLayout(cy: Core, layout: LayoutName, visibleOnly = false) {
  const target = visibleOnly ? cy.elements().not(".filtered-out") : cy.elements();
  target.layout(layoutOptions(layout)).run();
}
