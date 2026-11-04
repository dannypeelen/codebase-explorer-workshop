import { useState } from "react";
import type { TreeFolder, TreeNode } from "../../domain/fileTree";
import { useAppState } from "../../state/AppState";
import styles from "./FileTreeView.module.css";

export function FileTreeView({ root, defaultDepthOpen = 1 }: { root: TreeFolder; defaultDepthOpen?: number }) {
  return (
    <div className={styles.tree}>
      {root.children.map((child) => (
        <TreeItem key={child.path} node={child} depth={0} defaultDepthOpen={defaultDepthOpen} />
      ))}
    </div>
  );
}

function TreeItem({ node, depth, defaultDepthOpen }: { node: TreeNode; depth: number; defaultDepthOpen: number }) {
  const [open, setOpen] = useState(depth < defaultDepthOpen);
  const { state, focusNode } = useAppState();

  if (node.kind === "file") {
    const selected = state.selectedNodeId === node.nodeId;
    return (
      <button
        type="button"
        className={`${styles.row} ${styles.fileRow} ${selected ? styles.selected : ""}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => focusNode(node.nodeId)}
        title={node.path}
      >
        <FileIcon />
        <span className={styles.label}>{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={`${styles.row} ${styles.folderRow}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}>›</span>
        <FolderIcon open={open} />
        <span className={styles.label}>{node.name}</span>
        <span className={styles.count}>{node.children.length}</span>
      </button>
      {open && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} depth={depth + 1} defaultDepthOpen={defaultDepthOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className={styles.icon}>
      <path
        d={open ? "M1.5 4.5h5l1.2 1.5H14.5v8.3H1.5z" : "M1.5 3.5h5l1.2 1.5H14.5v9H1.5z"}
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className={styles.icon}>
      <path
        d="M3 1.5h6l4 4v9H3z"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
