import { useEffect, useRef } from "react";
import styles from "./NodeContextMenu.module.css";

export interface ContextMenuState {
  nodeId: string;
  label: string;
  x: number;
  y: number;
}

export function NodeContextMenu({
  menu,
  hasPathAnchor,
  onExpand,
  onAnalyzeImpact,
  onSetPathStart,
  onFindPathHere,
  onClose,
}: {
  menu: ContextMenuState;
  hasPathAnchor: boolean;
  onExpand: () => void;
  onAnalyzeImpact: () => void;
  onSetPathStart: () => void;
  onFindPathHere: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={styles.menu} style={{ left: menu.x, top: menu.y }}>
      <div className={styles.header}>{menu.label}</div>
      <button
        type="button"
        onClick={() => {
          onExpand();
          onClose();
        }}
      >
        Expand neighbors
      </button>
      <button
        type="button"
        onClick={() => {
          onAnalyzeImpact();
          onClose();
        }}
      >
        Analyze impact
      </button>
      <div className={styles.separator} />
      <button
        type="button"
        onClick={() => {
          onSetPathStart();
          onClose();
        }}
      >
        Set as path start
      </button>
      <button
        type="button"
        disabled={!hasPathAnchor}
        onClick={() => {
          onFindPathHere();
          onClose();
        }}
      >
        Find path from start to here
      </button>
    </div>
  );
}
