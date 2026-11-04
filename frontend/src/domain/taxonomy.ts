/**
 * Visual encoding rules, kept in one place so the graph canvas, legend,
 * and inspector badges can never disagree about what a color/shape means.
 */
import type { EdgeType, NodeType } from "../types/graph";

export type RelationshipCategory = "structural" | "historical" | "social" | "inferred";

export const RELATIONSHIP_CATEGORY_LABEL: Record<RelationshipCategory, string> = {
  structural: "Structural",
  historical: "Historical",
  social: "Social",
  inferred: "Inferred (LLM)",
};

/** Every EdgeType bucketed into the four relationship kinds the task asks
 * the canvas to distinguish. Structural = code shape (calls/imports/tests/
 * containment). Historical = git history. Social = who authored/reviewed/
 * owns/references what. Inferred = produced by the Gemini rationale pass
 * (shared.schema.Source.LLM_INFERENCE) — always rendered dashed so an
 * interpretation is never visually confused with a verified fact. */
export const EDGE_CATEGORY: Record<EdgeType, RelationshipCategory> = {
  CALLS: "structural",
  IMPORTS: "structural",
  DEFINES: "structural",
  PART_OF: "structural",
  INHERITS: "structural",
  DEPENDS_ON: "structural",
  TESTS: "structural",
  RENAMED_TO: "structural",
  MODIFIED_BY: "historical",
  INTRODUCED_IN: "historical",
  AUTHORED_BY: "social",
  REVIEWED_BY: "social",
  OWNS: "social",
  CLOSES: "social",
  REFERENCES: "social",
  MOTIVATED_BY: "inferred",
  DISCUSSED_IN: "inferred",
};

export const CATEGORY_COLOR: Record<RelationshipCategory, string> = {
  structural: "#5b9dff",
  historical: "#f5a742",
  social: "#36c08a",
  inferred: "#c77dff",
};

/** Node fill color — one hue family per entity kind, chosen for contrast
 * against the dark canvas background and against each other. */
export const NODE_COLOR: Record<NodeType, string> = {
  File: "#8a93a6",
  Module: "#6b7280",
  Class: "#f2b84b",
  Function: "#49c0d6",
  Method: "#2f9fb3",
  Commit: "#9f7df0",
  PullRequest: "#4fd17d",
  Issue: "#ff9966",
  Review: "#b8e35c",
  Comment: "#c2c7d1",
  Contributor: "#ff7eb6",
  Dependency: "#7c8cff",
  Test: "#36d6a0",
  Concept: "#e45cff",
  Discussion: "#5cc8ff",
};

/** Node shape — a second, color-independent channel for the same
 * distinction (accessibility: don't rely on hue alone). */
export const NODE_SHAPE: Record<NodeType, string> = {
  File: "round-rectangle",
  Module: "round-rectangle",
  Class: "ellipse",
  Function: "ellipse",
  Method: "ellipse",
  Commit: "diamond",
  PullRequest: "hexagon",
  Issue: "hexagon",
  Review: "pentagon",
  Comment: "round-tag",
  Contributor: "triangle",
  Dependency: "rectangle",
  Test: "octagon",
  Concept: "star",
  Discussion: "barrel",
};

export const NODE_TYPES: NodeType[] = [
  "File", "Module", "Class", "Function", "Method", "Commit", "PullRequest",
  "Issue", "Review", "Comment", "Contributor", "Dependency", "Test", "Concept", "Discussion",
];

export const EDGE_TYPES: EdgeType[] = [
  "CALLS", "IMPORTS", "DEFINES", "PART_OF", "MODIFIED_BY", "INTRODUCED_IN",
  "AUTHORED_BY", "REVIEWED_BY", "DISCUSSED_IN", "DEPENDS_ON", "MOTIVATED_BY",
  "CLOSES", "TESTS", "INHERITS", "RENAMED_TO", "REFERENCES", "OWNS",
];

export function nodeLabel(node: { type: NodeType; natural_key: string }): string {
  // Symbols/files are path-qualified ("src/flask/app.py::Flask.run") — the
  // trailing segment is what a person actually scans for in a dense graph.
  const parts = node.natural_key.split("::");
  const last = parts[parts.length - 1];
  const segments = last.split("/");
  return segments[segments.length - 1];
}
