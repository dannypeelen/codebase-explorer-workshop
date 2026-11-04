import type { NodeType } from "../../types/graph";
import { NODE_COLOR } from "../../domain/taxonomy";
import styles from "./Badge.module.css";

export function NodeTypeBadge({ type }: { type: NodeType }) {
  return (
    <span className={styles.badge} style={{ "--dot-color": NODE_COLOR[type] } as React.CSSProperties}>
      <span className={styles.dot} />
      {type}
    </span>
  );
}

export function SourceBadge({ source, verified }: { source: string; verified: boolean }) {
  return (
    <span className={verified ? styles.sourceVerified : styles.sourceInferred}>
      {verified ? "✓ " : "◆ "}
      {source.replace(/_/g, " ")}
    </span>
  );
}

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "warning" | "danger" }) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}
