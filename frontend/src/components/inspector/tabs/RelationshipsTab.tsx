import { useMemo, useState } from "react";
import { api } from "../../../api/client";
import { useAsync } from "../../../api/useAsync";
import type { ProvenanceRecord } from "../../../types/api";
import {
  CATEGORY_COLOR,
  EDGE_CATEGORY,
  NODE_COLOR,
  RELATIONSHIP_CATEGORY_LABEL,
  type RelationshipCategory,
} from "../../../domain/taxonomy";
import { useAppState } from "../../../state/AppState";
import { EmptyState, ErrorState, LoadingState, Spinner } from "../../common/StateViews";
import { SourceBadge } from "../../common/Badge";
import styles from "../ContextInspector.module.css";

export function RelationshipsTab({ nodeId }: { nodeId: string }) {
  const { focusNode } = useAppState();
  const result = useAsync((signal) => api.getNeighbors(nodeId, { signal }), [nodeId]);
  const [expandedEdgeId, setExpandedEdgeId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    if (result.status !== "success") return null;
    const groups = new Map<RelationshipCategory, typeof result.data>();
    for (const n of result.data) {
      const cat = EDGE_CATEGORY[n.edge_type];
      groups.set(cat, [...(groups.get(cat) ?? []), n]);
    }
    return groups;
  }, [result]);

  if (result.status === "loading") return <LoadingState label="Loading relationships…" />;
  if (result.status === "error") return <ErrorState error={result.error} />;
  if (!grouped || result.data.length === 0) {
    return <EmptyState title="No relationships" hint="This entity has no edges in the graph." />;
  }

  const order: RelationshipCategory[] = ["structural", "historical", "social", "inferred"];

  return (
    <div className={styles.tabContent}>
      {order
        .filter((cat) => grouped.has(cat))
        .map((cat) => (
          <section key={cat} className={styles.block}>
            <h4 className={styles.blockTitle} style={{ color: CATEGORY_COLOR[cat] }}>
              {RELATIONSHIP_CATEGORY_LABEL[cat]}
            </h4>
            <ul className={styles.relList}>
              {grouped.get(cat)!.map((n) => (
                <li key={n.edge_id}>
                  <div className={styles.relRow}>
                    <button type="button" className={styles.relRowMain} onClick={() => focusNode(n.node_id)}>
                      <span className={styles.relDirection}>{n.rel_direction === "out" ? "→" : "←"}</span>
                      <span className={styles.relEdgeType}>{n.edge_type}</span>
                      <span className={styles.relDot} style={{ background: NODE_COLOR[n.node_type] }} />
                      <span className={styles.relLabel}>{n.natural_key}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.evidenceToggle}
                      onClick={() => setExpandedEdgeId(expandedEdgeId === n.edge_id ? null : n.edge_id)}
                      title="View provenance"
                    >
                      ⓘ
                    </button>
                  </div>
                  {expandedEdgeId === n.edge_id && <EvidencePanel edgeId={n.edge_id} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function EvidencePanel({ edgeId }: { edgeId: string }) {
  const result = useAsync<ProvenanceRecord>((signal) => api.getProvenance(edgeId, signal), [edgeId]);

  if (result.status === "loading") {
    return (
      <div className={styles.evidencePanel}>
        <Spinner size={12} />
      </div>
    );
  }
  if (result.status === "error") {
    return <div className={styles.evidencePanel}>Couldn't load provenance: {result.error.message}</div>;
  }

  const verified = result.data.source !== "llm_inference";
  return (
    <div className={styles.evidencePanel}>
      <div className={styles.evidenceHeader}>
        <SourceBadge source={result.data.source} verified={verified} />
        <span className={styles.confidence}>confidence {result.data.confidence.toFixed(2)}</span>
      </div>
      <pre className={styles.evidenceJson}>{JSON.stringify(result.data.evidence, null, 2)}</pre>
      <div className={styles.evidenceMeta}>
        {result.data.extractor_version} · {new Date(result.data.extracted_at).toLocaleString()}
      </div>
    </div>
  );
}
