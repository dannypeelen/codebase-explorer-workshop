import { api } from "../../api/client";
import { useAsync } from "../../api/useAsync";

export interface DefinesLocation {
  file: string;
  line_start?: number;
  line_end?: number;
}

/** Function/Class/Method nodes don't carry their own file/line range (see
 * extraction/code/build.py) — it's only on the incoming DEFINES edge's
 * provenance.evidence. The public API doesn't expose evidence on the
 * neighbors list (that's `edge_properties`, a different column), only via
 * /provenance/{edge_id} — so this is a genuine two-hop lookup through
 * existing endpoints, not a new one. */
export function useDefinesLocation(nodeId: string | null, enabled: boolean) {
  return useAsync<DefinesLocation | null>(
    async (signal) => {
      if (!enabled || !nodeId) return null;
      const neighbors = await api.getNeighbors(nodeId, { edgeTypes: ["DEFINES"], direction: "in", signal });
      if (neighbors.length === 0) return null;
      const provenance = await api.getProvenance(neighbors[0].edge_id, signal);
      const evidence = provenance.evidence as Record<string, unknown>;
      if (typeof evidence.file !== "string") return null;
      return {
        file: evidence.file,
        line_start: typeof evidence.line_start === "number" ? evidence.line_start : undefined,
        line_end: typeof evidence.line_end === "number" ? evidence.line_end : undefined,
      };
    },
    [nodeId, enabled],
  );
}
