import type { LayoutName } from "../../state/AppState";
import { useAppState } from "../../state/AppState";
import styles from "./CanvasToolbar.module.css";

const LAYOUTS: { value: LayoutName; label: string }[] = [
  { value: "fcose", label: "Force" },
  { value: "breadthfirst", label: "Hierarchical" },
  { value: "concentric", label: "Concentric" },
  { value: "circle", label: "Circle" },
  { value: "grid", label: "Grid" },
];

export function CanvasToolbar({
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleLegend,
  legendOpen,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleLegend: () => void;
  legendOpen: boolean;
}) {
  const { state, dispatch } = useAppState();

  return (
    <div className={styles.toolbar}>
      <select
        className={styles.layoutSelect}
        value={state.layout}
        onChange={(e) => dispatch({ type: "SET_LAYOUT", layout: e.target.value as LayoutName })}
        title="Graph layout"
      >
        {LAYOUTS.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
      <div className={styles.divider} />
      <button type="button" className={styles.iconButton} onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
        −
      </button>
      <button type="button" className={styles.iconButton} onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
        +
      </button>
      <button type="button" className={styles.iconButton} onClick={onFit} title="Fit to view" aria-label="Fit to view">
        ⤢
      </button>
      <div className={styles.divider} />
      <button
        type="button"
        className={`${styles.iconButton} ${legendOpen ? styles.iconButtonActive : ""}`}
        onClick={onToggleLegend}
        title="Toggle legend"
      >
        Legend
      </button>
    </div>
  );
}
