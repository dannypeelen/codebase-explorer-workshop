import { api } from "../../../api/client";
import { useAsync } from "../../../api/useAsync";
import type { Neighbor } from "../../../types/api";
import type { NodeDetails } from "../../../types/api";
import { useAppState } from "../../../state/AppState";
import { EmptyState, ErrorState, LoadingState } from "../../common/StateViews";
import styles from "../ContextInspector.module.css";

const SYMBOL_TYPES = ["Class", "Function", "Method"];

export function HistoryTab({ node }: { node: NodeDetails }) {
  const { focusNode } = useAppState();
  const supported = node.type === "File" || SYMBOL_TYPES.includes(node.type);

  const result = useAsync<{ commits: Neighbor[]; viaFile: Neighbor | null }>(
    async (signal) => {
      if (!supported) return { commits: [], viaFile: null };
      if (node.type === "File") {
        const commits = await api.getNeighbors(node.id, { edgeTypes: ["MODIFIED_BY"], direction: "out", signal });
        return { commits, viaFile: null };
      }
      const containing = await api.getNeighbors(node.id, { edgeTypes: ["PART_OF"], direction: "out", nodeTypes: ["File"], signal });
      if (containing.length === 0) return { commits: [], viaFile: null };
      const commits = await api.getNeighbors(containing[0].node_id, { edgeTypes: ["MODIFIED_BY"], direction: "out", signal });
      return { commits, viaFile: containing[0] };
    },
    [node.id, node.type, supported],
  );

  if (!supported) {
    return (
      <div className={styles.tabContent}>
        <EmptyState title="History is tracked at the file level" hint="Select a File node, or a symbol within one, to see modification history." />
      </div>
    );
  }
  if (result.status === "loading") return <LoadingState label="Loading history…" />;
  if (result.status === "error") return <ErrorState error={result.error} />;
  if (result.data.commits.length === 0) {
    return <EmptyState title="No recorded history" hint="No MODIFIED_BY commits are linked yet." />;
  }

  const sorted = [...result.data.commits].sort((a, b) => {
    const ad = (a.node_properties.committer_date as string) ?? "";
    const bd = (b.node_properties.committer_date as string) ?? "";
    return bd.localeCompare(ad);
  });

  return (
    <div className={styles.tabContent}>
      {result.data.viaFile && (
        <p className={styles.note}>
          Shown via containing file{" "}
          <button type="button" className={styles.inlineLink} onClick={() => focusNode(result.data.viaFile!.node_id)}>
            {result.data.viaFile.natural_key}
          </button>
          .
        </p>
      )}
      <ul className={styles.relList}>
        {sorted.map((c) => (
          <li key={c.edge_id}>
            <button type="button" className={styles.commitRow} onClick={() => focusNode(c.node_id)}>
              <span className={styles.commitSha}>{c.natural_key.slice(0, 8)}</span>
              <span className={styles.commitMessage}>{String(c.node_properties.message ?? "").split("\n")[0] || "(no message)"}</span>
              {typeof c.node_properties.committer_date === "string" && (
                <span className={styles.commitDate}>{new Date(c.node_properties.committer_date).toLocaleDateString()}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
