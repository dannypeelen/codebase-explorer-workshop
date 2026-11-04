import { api } from "../../api/client";
import { useAsync } from "../../api/useAsync";
import { useAppState } from "../../state/AppState";
import { NodeTypeBadge } from "../common/Badge";
import { EmptyState, ErrorState, LoadingState } from "../common/StateViews";
import styles from "./ImpactPanel.module.css";

export function ImpactPanel({ nodeId }: { nodeId: string }) {
  const { dispatch, focusNode } = useAppState();
  const result = useAsync((signal) => api.getImpact(nodeId, { maxDepth: 3, signal }), [nodeId]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Impact analysis</h3>
        <button type="button" className={styles.closeButton} onClick={() => dispatch({ type: "CLEAR_IMPACT" })}>
          Close
        </button>
      </div>

      {result.status === "loading" && <LoadingState label="Analyzing impact…" />}
      {result.status === "error" && <ErrorState error={result.error} />}
      {result.status === "success" && (
        <div className={styles.body}>
          <div className={styles.targetRow}>
            <NodeTypeBadge type={result.data.target.type} />
            <span className={styles.targetKey}>{result.data.target.natural_key}</span>
          </div>

          <Section
            title={`Direct callers (${result.data.direct_callers.length})`}
            empty="Nothing directly calls this."
          >
            {result.data.direct_callers.map((n) => (
              <Row key={n.edge_id} onClick={() => focusNode(n.node_id)} label={n.natural_key} tone="direct" />
            ))}
          </Section>

          <Section
            title={`Direct dependencies (${result.data.direct_dependencies.length})`}
            empty="This doesn't directly call, import, or depend on anything tracked."
          >
            {result.data.direct_dependencies.map((n) => (
              <Row key={n.edge_id} onClick={() => focusNode(n.node_id)} label={n.natural_key} tone="direct" />
            ))}
          </Section>

          <Section
            title={`Transitive callers (${result.data.transitive_callers.length})`}
            empty="No indirect callers found within the analyzed depth."
            hint="Everything that could be affected if this symbol's behavior changes, up to 3 hops away."
          >
            {result.data.transitive_callers.map((n) => (
              <Row key={n.id} onClick={() => focusNode(n.id)} label={n.natural_key} tone="transitive" />
            ))}
          </Section>

          <Section title={`Affected modules (${result.data.affected_modules.length})`} empty="No files identified.">
            {result.data.affected_modules.map((n) => (
              <Row key={n.id} onClick={() => focusNode(n.id)} label={n.natural_key} tone="module" />
            ))}
          </Section>

          <Section
            title={`Tests (${result.data.tests.length})`}
            empty="No tests directly cover this symbol or its callers."
          >
            {result.data.tests.map((n) => (
              <Row key={n.id} onClick={() => focusNode(n.id)} label={n.natural_key} tone="test" />
            ))}
          </Section>

          <Section
            title={`Historical changes (${result.data.historical_changes.length})`}
            empty="No commit history found for the containing file(s)."
          >
            {result.data.historical_changes.slice(0, 15).map((n) => (
              <Row
                key={n.id}
                onClick={() => focusNode(n.id)}
                label={String(n.properties.message ?? n.natural_key).split("\n")[0]}
                tone="history"
              />
            ))}
          </Section>

          <Section
            title={`Design constraints (${result.data.design_constraints.length})`}
            empty="No extracted architectural decisions linked to this file's history."
            hint="LLM-extracted from PR/commit discussion — interpretations, not verified facts."
          >
            {result.data.design_constraints.map((n) => (
              <Row key={n.id} onClick={() => focusNode(n.id)} label={String(n.properties.statement ?? n.natural_key)} tone="concept" />
            ))}
          </Section>

          <div className={styles.explanation}>
            <div className={styles.explanationTitle}>What this means</div>
            {result.data.caveats.map((c, i) => (
              <p key={i} className={styles.caveat}>
                {c}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  hint,
  children,
}: {
  title: string;
  empty: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>{title}</h4>
      {hint && <p className={styles.sectionHint}>{hint}</p>}
      {hasChildren ? <ul className={styles.rowList}>{children}</ul> : <EmptyState title={empty} />}
    </section>
  );
}

function Row({ label, onClick, tone }: { label: string; onClick: () => void; tone: string }) {
  return (
    <li>
      <button type="button" className={`${styles.row} ${styles[`tone-${tone}`]}`} onClick={onClick}>
        {label}
      </button>
    </li>
  );
}
