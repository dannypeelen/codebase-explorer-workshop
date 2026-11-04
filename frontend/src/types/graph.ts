/**
 * TypeScript mirror of shared/schema.py. Keep these two files in sync by
 * hand — this is the one place drift between frontend and backend contracts
 * can silently creep in. If you add a field in schema.py, add it here too.
 */

export type NodeType =
  | "File"
  | "Module"
  | "Class"
  | "Function"
  | "Method"
  | "Commit"
  | "PullRequest"
  | "Issue"
  | "Review"
  | "Comment"
  | "Contributor"
  | "Dependency"
  | "Test"
  | "Concept"
  | "Discussion";

export type EdgeType =
  | "CALLS"
  | "IMPORTS"
  | "DEFINES"
  | "PART_OF"
  | "MODIFIED_BY"
  | "INTRODUCED_IN"
  | "AUTHORED_BY"
  | "REVIEWED_BY"
  | "DISCUSSED_IN"
  | "DEPENDS_ON"
  | "MOTIVATED_BY"
  | "CLOSES"
  | "TESTS"
  | "INHERITS"
  | "RENAMED_TO"
  | "REFERENCES"
  | "OWNS";

export type Source =
  | "static_analysis"
  | "git_history"
  | "github_api"
  | "repo_config"
  | "llm_inference";

/** Sources that are deterministic facts rather than model guesses. */
export const VERIFIED_SOURCES: ReadonlySet<Source> = new Set([
  "static_analysis",
  "git_history",
  "github_api",
  "repo_config",
]);

export interface Provenance {
  source: Source;
  evidence: Record<string, unknown>;
  confidence: number; // 1.0 for deterministic sources; <1.0 only for llm_inference
  extractor_version: string;
  extracted_at: string; // ISO 8601
}

export interface GraphNode {
  id: string;
  type: NodeType;
  repo: string;
  natural_key: string;
  properties: Record<string, unknown>;
  provenance?: Provenance | null;
}

export interface GraphEdge {
  id: string;
  type: EdgeType;
  src_id: string;
  dst_id: string;
  properties: Record<string, unknown>;
  provenance: Provenance;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
