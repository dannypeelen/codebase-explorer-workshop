import { NODE_COLOR, EDGE_TYPES, EDGE_CATEGORY, CATEGORY_COLOR, NODE_TYPES } from "../../domain/taxonomy";
import { useAppState } from "../../state/AppState";
import styles from "./TypeFilters.module.css";

export function TypeFilters() {
  const { state, dispatch } = useAppState();

  return (
    <div className={styles.filters}>
      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span>Node types</span>
          <div className={styles.groupActions}>
            <button type="button" onClick={() => dispatch({ type: "SET_ALL_NODE_TYPES", visible: true })}>
              All
            </button>
            <button type="button" onClick={() => dispatch({ type: "SET_ALL_NODE_TYPES", visible: false })}>
              None
            </button>
          </div>
        </div>
        <div className={styles.chipGrid}>
          {NODE_TYPES.map((t) => {
            const active = state.visibleNodeTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() => dispatch({ type: "TOGGLE_NODE_TYPE", nodeType: t })}
              >
                <span className={styles.chipDot} style={{ background: NODE_COLOR[t] }} />
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>
          <span>Relationship types</span>
          <div className={styles.groupActions}>
            <button type="button" onClick={() => dispatch({ type: "SET_ALL_EDGE_TYPES", visible: true })}>
              All
            </button>
            <button type="button" onClick={() => dispatch({ type: "SET_ALL_EDGE_TYPES", visible: false })}>
              None
            </button>
          </div>
        </div>
        <div className={styles.chipGrid}>
          {EDGE_TYPES.map((t) => {
            const active = state.visibleEdgeTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() => dispatch({ type: "TOGGLE_EDGE_TYPE", edgeType: t })}
              >
                <span className={styles.chipDot} style={{ background: CATEGORY_COLOR[EDGE_CATEGORY[t]] }} />
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
