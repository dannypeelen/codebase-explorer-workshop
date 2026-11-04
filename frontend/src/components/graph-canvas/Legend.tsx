import { CATEGORY_COLOR, NODE_COLOR, RELATIONSHIP_CATEGORY_LABEL, type RelationshipCategory } from "../../domain/taxonomy";
import styles from "./Legend.module.css";

const CATEGORIES: RelationshipCategory[] = ["structural", "historical", "social", "inferred"];

export function Legend() {
  return (
    <div className={styles.legend}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Entities</div>
        <div className={styles.row}>
          {(Object.keys(NODE_COLOR) as (keyof typeof NODE_COLOR)[]).map((type) => (
            <span key={type} className={styles.item}>
              <span className={styles.dot} style={{ background: NODE_COLOR[type] }} />
              {type}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Relationships</div>
        <div className={styles.row}>
          {CATEGORIES.map((cat) => (
            <span key={cat} className={styles.item}>
              <span
                className={`${styles.line} ${cat === "inferred" ? styles.dashed : ""}`}
                style={{ background: cat === "inferred" ? "transparent" : CATEGORY_COLOR[cat], borderColor: CATEGORY_COLOR[cat] }}
              />
              {RELATIONSHIP_CATEGORY_LABEL[cat]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
