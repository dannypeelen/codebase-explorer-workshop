import type { NodeDetails } from "../../../types/api";
import { useAppState } from "../../../state/AppState";
import { Pill } from "../../common/Badge";
import styles from "../ContextInspector.module.css";

const DISPLAY_PROPERTY_ORDER = [
  "title", "body", "message", "state", "merged", "url", "login", "name", "email",
  "decorators", "bases", "claim_type", "statement", "confidence", "category", "ecosystem",
];

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function OverviewTab({ node }: { node: NodeDetails }) {
  const { startImpact } = useAppState();
  const entries = Object.entries(node.properties)
    .filter(([key, v]) => !["body", "message", "statement", "evidence_quote"].includes(key) && v !== null && v !== "")
    .sort(([a], [b]) => {
      const ai = DISPLAY_PROPERTY_ORDER.indexOf(a);
      const bi = DISPLAY_PROPERTY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const relCounts = Object.entries(node.relationship_counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className={styles.tabContent}>
      <section className={styles.block}>
        <h4 className={styles.blockTitle}>Identity</h4>
        <dl className={styles.kvList}>
          <dt>Natural key</dt>
          <dd className="mono">{node.natural_key}</dd>
          <dt>Repository</dt>
          <dd>{node.repo}</dd>
          <dt>Node ID</dt>
          <dd className="mono" style={{ fontSize: 10.5 }}>
            {node.id}
          </dd>
        </dl>
      </section>

      {entries.length > 0 && (
        <section className={styles.block}>
          <h4 className={styles.blockTitle}>Properties</h4>
          <dl className={styles.kvList}>
            {entries.map(([key, value]) => (
              <div className={styles.kvRow} key={key}>
                <dt>{key.replace(/_/g, " ")}</dt>
                <dd>{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {relCounts.length > 0 && (
        <section className={styles.block}>
          <h4 className={styles.blockTitle}>Connections</h4>
          <div className={styles.pillRow}>
            {relCounts.map(([key, count]) => (
              <Pill key={key}>
                {key.replace(":", " ")} · {count}
              </Pill>
            ))}
          </div>
        </section>
      )}

      <button type="button" className={styles.primaryAction} onClick={() => startImpact(node.id)}>
        Analyze impact of changing this
      </button>
    </div>
  );
}
