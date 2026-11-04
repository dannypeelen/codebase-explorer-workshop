import type { NodeDetails } from "../../../types/api";
import { SourceBadge } from "../../common/Badge";
import { EmptyState } from "../../common/StateViews";
import styles from "../ContextInspector.module.css";

export function ProvenanceTab({ node }: { node: NodeDetails }) {
  if (!node.provenance) {
    return (
      <div className={styles.tabContent}>
        <EmptyState
          title="No node-level provenance"
          hint="Most node types don't carry their own provenance — the facts worth attributing are the relationships, not the entity's mere existence. Open any relationship's ⓘ for its evidence."
        />
      </div>
    );
  }

  const verified = node.provenance.source !== "llm_inference";
  return (
    <div className={styles.tabContent}>
      <section className={styles.block}>
        <div className={styles.evidenceHeader}>
          <SourceBadge source={node.provenance.source} verified={verified} />
          <span className={styles.confidence}>confidence {node.provenance.confidence.toFixed(2)}</span>
        </div>
        <pre className={styles.evidenceJson}>{JSON.stringify(node.provenance.evidence, null, 2)}</pre>
        <div className={styles.evidenceMeta}>
          {node.provenance.extractor_version} · {new Date(node.provenance.extracted_at).toLocaleString()}
        </div>
      </section>
      {!verified && (
        <p className={styles.note}>
          This was produced by an LLM interpretation pass, not deterministic extraction — treat it as a claim to
          verify, not a fact.
        </p>
      )}
    </div>
  );
}
