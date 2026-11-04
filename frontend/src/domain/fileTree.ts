import type { GraphNode } from "../types/graph";

export interface TreeFolder {
  kind: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

export interface TreeFile {
  kind: "file";
  name: string;
  path: string;
  nodeId: string;
}

export type TreeNode = TreeFolder | TreeFile;

/** Builds a nested folder tree from flat `File` node paths
 * ("src/flask/app.py") — pure string splitting, no graph traversal. */
export function buildFileTree(fileNodes: GraphNode[]): TreeFolder {
  const root: TreeFolder = { kind: "folder", name: "", path: "", children: [] };

  for (const node of fileNodes) {
    const segments = node.natural_key.split("/").filter(Boolean);
    let cursor = root;
    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const path = segments.slice(0, i + 1).join("/");
      if (isLast) {
        cursor.children.push({ kind: "file", name: segments[i], path, nodeId: node.id });
        continue;
      }
      let next = cursor.children.find((c) => c.kind === "folder" && c.name === segments[i]) as TreeFolder | undefined;
      if (!next) {
        next = { kind: "folder", name: segments[i], path, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(folder: TreeFolder) {
  folder.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of folder.children) {
    if (child.kind === "folder") sortTree(child);
  }
}

export function filterTree(folder: TreeFolder, query: string): TreeFolder | null {
  if (!query.trim()) return folder;
  const q = query.toLowerCase();

  function walk(node: TreeNode): TreeNode | null {
    if (node.kind === "file") {
      return node.name.toLowerCase().includes(q) ? node : null;
    }
    const matchedChildren = node.children.map(walk).filter((c): c is TreeNode => c !== null);
    if (matchedChildren.length === 0 && !node.name.toLowerCase().includes(q)) return null;
    return { ...node, children: matchedChildren.length ? matchedChildren : node.children };
  }

  const result = walk(folder);
  return result && result.kind === "folder" ? result : folder;
}
