import { useState } from "react";
import { api } from "../../api/client";
import { useAsync } from "../../api/useAsync";
import { useAppState } from "../../state/AppState";
import { NodeTypeBadge } from "../common/Badge";
import { EmptyState, ErrorState, LoadingState } from "../common/StateViews";
import { OverviewTab } from "./tabs/OverviewTab";
import { SourceTab } from "./tabs/SourceTab";
import { RelationshipsTab } from "./tabs/RelationshipsTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { SocialTab } from "./tabs/SocialTab";
import { ProvenanceTab } from "./tabs/ProvenanceTab";
import styles from "./ContextInspector.module.css";

type Tab = "overview" | "source" | "relationships" | "history" | "social" | "provenance";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "source", label: "Source" },
  { id: "relationships", label: "Relations" },
  { id: "history", label: "History" },
  { id: "social", label: "PRs & Issues" },
  { id: "provenance", label: "Provenance" },
];

export function ContextInspector() {
  const { state } = useAppState();
  const [tab, setTab] = useState<Tab>("overview");

  const result = useAsync(
    (signal) => (state.selectedNodeId ? api.getNode(state.selectedNodeId, signal) : Promise.reject(new Error("no selection"))),
    [state.selectedNodeId],
  );

  if (!state.selectedNodeId) {
    return (
      <div className={styles.panel}>
        <EmptyState
          title="No entity selected"
          hint="Click a node in the graph, or a file in the explorer, to inspect it here."
        />
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {result.status === "loading" && <LoadingState label="Loading entity…" />}
      {result.status === "error" && <ErrorState error={result.error} />}
      {result.status === "success" && (
        <>
          <div className={styles.header}>
            <NodeTypeBadge type={result.data.type} />
            <h3 className={styles.title}>{result.data.natural_key.split("/").pop()?.split("::").pop()}</h3>
          </div>
          <nav className={styles.tabs}>
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? styles.tabActive : styles.tab} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className={styles.body}>
            {tab === "overview" && <OverviewTab node={result.data} />}
            {tab === "source" && <SourceTab node={result.data} />}
            {tab === "relationships" && <RelationshipsTab nodeId={result.data.id} />}
            {tab === "history" && <HistoryTab node={result.data} />}
            {tab === "social" && <SocialTab nodeId={result.data.id} nodeType={result.data.type} />}
            {tab === "provenance" && <ProvenanceTab node={result.data} />}
          </div>
        </>
      )}
    </div>
  );
}
