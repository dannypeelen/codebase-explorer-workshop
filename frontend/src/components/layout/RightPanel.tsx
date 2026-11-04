import { useAppState } from "../../state/AppState";
import { ContextInspector } from "../inspector/ContextInspector";
import { AIQueryPanel } from "../ai-query/AIQueryPanel";
import { ImpactPanel } from "../impact/ImpactPanel";
import styles from "./RightPanel.module.css";

export function RightPanel() {
  const { state, dispatch } = useAppState();

  if (state.impactNodeId) {
    return <ImpactPanel nodeId={state.impactNodeId} />;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.tabs}>
        <button
          type="button"
          className={state.rightPanelTab === "inspector" ? styles.tabActive : styles.tab}
          onClick={() => dispatch({ type: "SET_RIGHT_PANEL_TAB", tab: "inspector" })}
        >
          Inspector
        </button>
        <button
          type="button"
          className={state.rightPanelTab === "ai" ? styles.tabActive : styles.tab}
          onClick={() => dispatch({ type: "SET_RIGHT_PANEL_TAB", tab: "ai" })}
        >
          Ask AI
        </button>
      </nav>
      <div className={styles.content}>
        {state.rightPanelTab === "inspector" ? <ContextInspector /> : <AIQueryPanel />}
      </div>
    </div>
  );
}
