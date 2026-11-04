/**
 * Typed fetch wrappers for every api/openapi.yaml endpoint. This is the
 * only file that calls `fetch` against the api service — components go
 * through here so the request/error shape stays consistent everywhere.
 */
import type { EdgeType, GraphEdge, GraphNode, NodeType, Subgraph } from "../types/graph";
import type {
  AskAnswer,
  GraphResponse,
  ImpactAnalysis,
  IngestStatus,
  NodeDetails,
  PathsResponse,
  ProvenanceRecord,
  SearchHit,
} from "../types/api";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type QueryValue = string | number | boolean | string[] | undefined | null;

function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, v);
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, options?: { signal?: AbortSignal; method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options?.method ?? "GET",
      signal: options?.signal,
      headers: options?.body ? { "Content-Type": "application/json" } : undefined,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Could not reach the context graph API — is it running?");
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // non-JSON error body; fall back to statusText
    }
    throw new ApiError(response.status, detail);
  }
  return (await response.json()) as T;
}

export interface GraphQuery {
  repo: string;
  nodeTypes?: NodeType[];
  edgeTypes?: EdgeType[];
  limit?: number;
  signal?: AbortSignal;
}

export const api = {
  ingestStatus(repo: string, signal?: AbortSignal): Promise<IngestStatus> {
    return request(`/ingest/status${buildQuery({ repo })}`, { signal });
  },

  getGraph({ repo, nodeTypes, edgeTypes, limit, signal }: GraphQuery): Promise<GraphResponse> {
    const qs = buildQuery({ repo, node_types: nodeTypes, edge_types: edgeTypes, limit });
    return request(`/graph${qs}`, { signal });
  },

  getNode(nodeId: string, signal?: AbortSignal): Promise<NodeDetails> {
    return request(`/nodes/${encodeURIComponent(nodeId)}`, { signal });
  },

  getNeighbors(
    nodeId: string,
    opts: { edgeTypes?: EdgeType[]; nodeTypes?: NodeType[]; direction?: "out" | "in" | "both"; signal?: AbortSignal } = {},
  ) {
    const qs = buildQuery({ edge_types: opts.edgeTypes, node_types: opts.nodeTypes, direction: opts.direction });
    return request<import("../types/api").Neighbor[]>(`/nodes/${encodeURIComponent(nodeId)}/neighbors${qs}`, {
      signal: opts.signal,
    });
  },

  getSubgraph(opts: {
    nodeId: string;
    depth?: number;
    edgeTypes?: EdgeType[];
    direction?: "out" | "in" | "both";
    signal?: AbortSignal;
  }): Promise<Subgraph> {
    const qs = buildQuery({
      node_id: opts.nodeId,
      depth: opts.depth,
      edge_types: opts.edgeTypes,
      direction: opts.direction,
    });
    return request(`/subgraph${qs}`, { signal: opts.signal });
  },

  getPaths(opts: {
    fromId: string;
    toId: string;
    maxDepth?: number;
    edgeTypes?: EdgeType[];
    directed?: boolean;
    limit?: number;
    signal?: AbortSignal;
  }): Promise<PathsResponse> {
    const qs = buildQuery({
      from_id: opts.fromId,
      to_id: opts.toId,
      max_depth: opts.maxDepth,
      edge_types: opts.edgeTypes,
      directed: opts.directed,
      limit: opts.limit,
    });
    return request(`/paths${qs}`, { signal: opts.signal });
  },

  getImpact(nodeId: string, opts: { maxDepth?: number; maxResults?: number; signal?: AbortSignal } = {}): Promise<ImpactAnalysis> {
    const qs = buildQuery({ max_depth: opts.maxDepth, max_results: opts.maxResults });
    return request(`/impact/${encodeURIComponent(nodeId)}${qs}`, { signal: opts.signal });
  },

  search(opts: { q: string; repo: string; nodeType?: NodeType; topK?: number; signal?: AbortSignal }): Promise<SearchHit[]> {
    const qs = buildQuery({ q: opts.q, repo: opts.repo, node_type: opts.nodeType, top_k: opts.topK });
    return request(`/search${qs}`, { signal: opts.signal });
  },

  ask(opts: { question: string; repo: string; signal?: AbortSignal }): Promise<AskAnswer> {
    return request(`/ask`, { method: "POST", body: { question: opts.question, repo: opts.repo }, signal: opts.signal });
  },

  getProvenance(edgeId: string, signal?: AbortSignal): Promise<ProvenanceRecord> {
    return request(`/provenance/${encodeURIComponent(edgeId)}`, { signal });
  },
};

export type { AskAnswer, GraphNode, GraphEdge };
