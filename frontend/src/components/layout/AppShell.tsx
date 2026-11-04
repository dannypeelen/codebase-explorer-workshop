import { useState, type ReactNode } from "react";
import styles from "./AppShell.module.css";

export function AppShell({
  topBar,
  sidebar,
  canvas,
  rightPanel,
}: {
  topBar: ReactNode;
  sidebar: ReactNode;
  canvas: ReactNode;
  rightPanel: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>{topBar}</header>
      <div className={styles.body}>
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ""}`}>
          {!sidebarCollapsed && sidebar}
          <button
            type="button"
            className={styles.collapseHandle}
            style={{ left: "auto" }}
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? "Expand repository explorer" : "Collapse repository explorer"}
            title={sidebarCollapsed ? "Expand repository explorer" : "Collapse repository explorer"}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </aside>
        <main className={styles.canvas}>{canvas}</main>
        <aside className={`${styles.rightPanel} ${rightCollapsed ? styles.collapsed : ""}`}>
          <button
            type="button"
            className={styles.collapseHandleRight}
            onClick={() => setRightCollapsed((v) => !v)}
            aria-label={rightCollapsed ? "Expand context panel" : "Collapse context panel"}
            title={rightCollapsed ? "Expand context panel" : "Collapse context panel"}
          >
            {rightCollapsed ? "‹" : "›"}
          </button>
          {!rightCollapsed && rightPanel}
        </aside>
      </div>
    </div>
  );
}
