import { api } from "../../api/client";
import { useAsync } from "../../api/useAsync";
import { useAppState } from "../../state/AppState";
import { Pill } from "../common/Badge";
import { Spinner } from "../common/StateViews";
import styles from "./TopBar.module.css";

export function TopBar() {
  const { state } = useAppState();
  const status = useAsync((signal) => api.ingestStatus(state.repo, signal), [state.repo]);

  return (
    <div className={styles.bar}>
      <div className={styles.identity}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={styles.mark}>
          <circle cx="6" cy="6" r="3" fill="currentColor" />
          <circle cx="18" cy="6" r="3" fill="currentColor" opacity="0.6" />
          <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.8" />
          <path d="M8.5 7.5L15.5 7.5M9 9L11 15.5M15 9L13 15.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
        </svg>
        <span className={styles.productName}>Context Graph</span>
        <span className={styles.repoName}>{state.repo}</span>
      </div>
      <div className={styles.statusArea}>
        {status.status === "loading" && <Spinner size={13} />}
        {status.status === "error" && <Pill tone="danger">API unreachable</Pill>}
        {status.status === "success" && (
          <>
            <Pill tone={status.data.ingested ? "accent" : "warning"}>
              {status.data.ingested ? "Ingested" : "Not ingested"}
            </Pill>
            <span className={styles.statCount}>{status.data.total_nodes.toLocaleString()} nodes</span>
            <span className={styles.statCount}>{status.data.total_edges.toLocaleString()} edges</span>
            {status.data.embedding_count > 0 && (
              <span className={styles.statCount}>{status.data.embedding_count.toLocaleString()} embeddings</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
