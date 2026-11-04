import type { EdgeType, NodeType } from "../../types/graph";
import { CATEGORY_COLOR, EDGE_CATEGORY, NODE_COLOR, NODE_SHAPE } from "../../domain/taxonomy";

// Cytoscape's own `Stylesheet` type (namespace-exported via `export =`)
// doesn't play nicely with verbatimModuleSyntax type-only imports in this
// TS version — a loose local shape is all `cy.style(...)` actually needs.
interface Stylesheet {
  selector: string;
  style: Record<string, unknown>;
}

function nodeStyleRules(): Stylesheet[] {
  return (Object.keys(NODE_COLOR) as NodeType[]).map((type) => ({
    selector: `node[nodeType = "${type}"]`,
    style: {
      "background-color": NODE_COLOR[type],
      shape: NODE_SHAPE[type] as never,
    },
  }));
}

function edgeStyleRules(): Stylesheet[] {
  return (Object.keys(EDGE_CATEGORY) as EdgeType[]).map((type) => {
    const category = EDGE_CATEGORY[type];
    const color = CATEGORY_COLOR[category];
    return {
      selector: `edge[edgeType = "${type}"]`,
      style: {
        "line-color": color,
        "target-arrow-color": color,
        "line-style": category === "inferred" ? "dashed" : "solid",
        "line-dash-pattern": category === "inferred" ? [4, 3] : [1, 0],
      },
    };
  });
}

export function buildStylesheet(): Stylesheet[] {
  return [
    {
      selector: "node",
      style: {
        width: 22,
        height: 22,
        "font-size": 9,
        "font-family": "var(--mono)",
        color: "#c7cbd6",
        "text-outline-width": 0,
        label: "data(label)",
        "text-valign": "bottom",
        "text-margin-y": 5,
        "border-width": 1.5,
        "border-color": "rgba(255,255,255,0.18)",
        "overlay-opacity": 0,
        "transition-property": "opacity, border-width, border-color, width, height",
        "transition-duration": 120,
      },
    },
    ...nodeStyleRules(),
    {
      selector: "edge",
      style: {
        width: 1.1,
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.7,
        opacity: 0.55,
        "transition-property": "opacity, width",
        "transition-duration": 120,
      },
    },
    ...edgeStyleRules(),

    // Interaction states
    { selector: "node.dimmed", style: { opacity: 0.15 } },
    { selector: "edge.dimmed", style: { opacity: 0.05 } },
    {
      selector: "node.highlighted",
      style: { "border-width": 3, "border-color": "#ffffff", "z-index": 20 },
    },
    { selector: "edge.highlighted", style: { opacity: 1, width: 2 } },
    {
      selector: "node.selected-node",
      style: { "border-width": 3.5, "border-color": "#ffffff", width: 28, height: 28, "z-index": 30 },
    },

    // Impact analysis states
    {
      selector: "node.impact-target",
      style: {
        "border-width": 4,
        "border-color": "#ffffff",
        width: 32,
        height: 32,
        "z-index": 40,
      },
    },
    { selector: "node.impact-direct", style: { "border-width": 3, "border-color": "#ff9966", "z-index": 25 } },
    { selector: "node.impact-transitive", style: { "border-width": 2, "border-color": "#f5a742", opacity: 0.9 } },
    { selector: "node.impact-module", style: { "border-width": 2.5, "border-color": "#6ea8fe" } },
    { selector: "node.impact-test", style: { "border-width": 2.5, "border-color": "#36d6a0" } },
    { selector: "node.impact-dim", style: { opacity: 0.12 } },
    { selector: "edge.impact-dim", style: { opacity: 0.03 } },
    { selector: "edge.impact-path", style: { opacity: 1, width: 2.5, "line-color": "#ffffff", "target-arrow-color": "#ffffff" } },

    // Path finder
    { selector: "node.path-node", style: { "border-width": 3, "border-color": "#ffd166", "z-index": 35 } },
    { selector: "edge.path-edge", style: { opacity: 1, width: 3, "line-color": "#ffd166", "target-arrow-color": "#ffd166" } },
    { selector: "node.path-anchor", style: { "border-width": 4, "border-color": "#ffd166" } },

    { selector: ".filtered-out", style: { display: "none" } },
  ];
}
