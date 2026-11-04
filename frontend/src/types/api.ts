/**
 * Response shapes for api/openapi.yaml endpoints that aren't plain
 * Node/Edge/Subgraph (those are in graph.ts, mirroring shared/schema.py).
 * Keep in sync with api/openapi.yaml by hand, same rule as graph.ts.
 */
import type { EdgeType, GraphEdge, GraphNode, NodeType } from "./graph";

export interface Neighbor {
  edge_id: string;
  edge_type: EdgeType;
  edge_properties: Record<string, unknown>;
  rel_direction: "out" | "in";
  node_id: string;
  node_type: NodeType;
  node_repo: string;
  natural_key: string;
  node_properties: Record<string, unknown>;
}

export interface NodeDetails extends GraphNode {
  relationship_counts: Record<string, number>;
  created_at?: string;
  updated_at?: string;
}

export interface IngestStatus {
  repo: string;
  ingested: boolean;
  node_counts: Record<string, number>;
  edge_counts: Record<string, number>;
  total_nodes: number;
  total_edges: number;
  embedding_count: number;
  latest_embedding_at: string | null;
  earliest_node_created_at: string | null;
  latest_node_updated_at: string | null;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  truncated: boolean;
}

export interface PathResult {
  length: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface PathsResponse {
  found: boolean;
  paths: PathResult[];
}

export interface ImpactAnalysis {
  target: GraphNode;
  direct_callers: Neighbor[];
  direct_dependencies: Neighbor[];
  transitive_callers: GraphNode[];
  affected_modules: GraphNode[];
  tests: GraphNode[];
  historical_changes: GraphNode[];
  design_constraints: GraphNode[];
  caveats: string[];
}

export interface SearchHit {
  node_id: string;
  type: NodeType;
  natural_key: string;
  similarity: number;
  source_type: string;
  snippet: string;
  file_path: string | null;
  line_start: number | null;
  line_end: number | null;
  github_ref: string | null;
}

export interface Citation {
  node_id: string;
  type: NodeType;
  natural_key: string;
  quote: string;
  url?: string;
  file_path?: string;
  line_start?: number;
  line_end?: number;
}

export interface AskAnswer {
  answer: string;
  citations: Citation[];
  dropped_citations: number;
  unable_to_answer: boolean;
  degraded: boolean;
}

export interface ProvenanceRecord {
  source: string;
  evidence: Record<string, unknown>;
  confidence: number;
  extractor_version: string;
  extracted_at: string;
}
