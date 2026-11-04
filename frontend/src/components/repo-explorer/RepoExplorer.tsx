import { useMemo, useState } from "react";
import { api } from "../../api/client";
import { useAsync } from "../../api/useAsync";
import { buildFileTree, filterTree } from "../../domain/fileTree";
import { useAppState } from "../../state/AppState";
import { EmptyState, ErrorState, LoadingState } from "../common/StateViews";
import { FileTreeView } from "./FileTreeView";
import { TypeFilters } from "./TypeFilters";
import styles from "./RepoExplorer.module.css";

type Section = "files" | "filters";

export function RepoExplorer() {
  const { state } = useAppState();
  const [section, setSection] = useState<Section>("files");
  const [query, setQuery] = useState("");

  const filesResult = useAsync(
    (signal) => api.getGraph({ repo: state.repo, nodeTypes: ["File"], limit: 2000, signal }),
    [state.repo],
  );

  const tree = useMemo(() => {
    if (filesResult.status !== "success") return null;
    const root = buildFileTree(filesResult.data.nodes);
    return filterTree(root, query);
  }, [filesResult, query]);

  return (
    <div className={styles.explorer}>
      <nav className={styles.tabs}>
        <button
          type="button"
          className={section === "files" ? styles.tabActive : styles.tab}
          onClick={() => setSection("files")}
        >
          Files
        </button>
        <button
          type="button"
          className={section === "filters" ? styles.tabActive : styles.tab}
          onClick={() => setSection("filters")}
        >
          Filters
        </button>
      </nav>

      {section === "files" && (
        <>
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Filter files…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className={styles.content}>
            {filesResult.status === "loading" && <LoadingState label="Loading files…" />}
            {filesResult.status === "error" && <ErrorState error={filesResult.error} />}
            {filesResult.status === "success" && filesResult.data.nodes.length === 0 && (
              <EmptyState title="No files ingested yet" hint="Run the extraction CLI's code pass against this repo." />
            )}
            {tree && tree.children.length > 0 && (
              <FileTreeView key={query} root={tree} defaultDepthOpen={query.trim() ? 99 : 1} />
            )}
            {tree && tree.children.length === 0 && filesResult.status === "success" && filesResult.data.nodes.length > 0 && (
              <EmptyState title="No files match" hint={`Nothing found for "${query}"`} />
            )}
          </div>
        </>
      )}

      {section === "filters" && (
        <div className={styles.content}>
          <TypeFilters />
        </div>
      )}
    </div>
  );
}
