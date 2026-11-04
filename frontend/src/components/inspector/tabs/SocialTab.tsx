import { api } from "../../../api/client";
import { useAsync } from "../../../api/useAsync";
import { useAppState } from "../../../state/AppState";
import { EmptyState, ErrorState, LoadingState } from "../../common/StateViews";
import { NodeTypeBadge } from "../../common/Badge";
import styles from "../ContextInspector.module.css";

const RELATED_TYPES = ["PullRequest", "Issue", "Discussion", "Review", "Comment"] as const;
const DIRECT_TYPES = new Set(["PullRequest", "Issue", "Discussion", "Review", "Comment", "Commit"]);

export function SocialTab({ nodeId, nodeType }: { nodeId: string; nodeType: string }) {
  const { focusNode } = useAppState();
  const supported = DIRECT_TYPES.has(nodeType);
  const result = useAsync(
    (signal) => (supported ? api.getNeighbors(nodeId, { nodeTypes: [...RELATED_TYPES], signal }) : Promise.resolve([])),
    [nodeId, supported],
  );

  if (!supported) {
    return (
      <div className={styles.tabContent}>
        <EmptyState
          title="Not directly linked to PRs or issues"
          hint="Code symbols connect to PRs via the commits that modified their file — check the History tab, then inspect a commit."
        />
      </div>
    );
  }
  if (result.status === "loading") return <LoadingState label="Loading related discussion…" />;
  if (result.status === "error") return <ErrorState error={result.error} />;
  if (result.data.length === 0) return <EmptyState title="No linked PRs, issues, or discussions" />;

  return (
    <div className={styles.tabContent}>
      <ul className={styles.relList}>
        {result.data.map((n) => (
          <li key={n.edge_id}>
            <button type="button" className={styles.relRowFull} onClick={() => focusNode(n.node_id)}>
              <NodeTypeBadge type={n.node_type} />
              <span className={styles.relEdgeType}>{n.edge_type}</span>
              <span className={styles.relLabel}>
                {typeof n.node_properties.title === "string" ? n.node_properties.title : n.natural_key}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
