import type { NodeType } from "../../../types/graph";
import type { NodeDetails } from "../../../types/api";
import { useDefinesLocation } from "../useDefinesLocation";
import { EmptyState, LoadingState } from "../../common/StateViews";
import styles from "../ContextInspector.module.css";

const SYMBOL_TYPES: NodeType[] = ["Class", "Function", "Method"];
const TEXT_PROPERTY_BY_TYPE: Partial<Record<NodeType, string>> = {
  Issue: "body",
  PullRequest: "body",
  Comment: "body",
  Review: "body",
  Discussion: "body",
  Commit: "message",
  Concept: "statement",
};

function githubBlobUrl(repo: string, file: string, lineStart?: number, lineEnd?: number): string | null {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  const lines = lineStart ? `#L${lineStart}${lineEnd && lineEnd !== lineStart ? `-L${lineEnd}` : ""}` : "";
  return `https://github.com/${repo}/blob/main/${file}${lines}`;
}

export function SourceTab({ node }: { node: NodeDetails }) {
  const isSymbol = SYMBOL_TYPES.includes(node.type);
  const location = useDefinesLocation(node.id, isSymbol);

  if (isSymbol) {
    return (
      <div className={styles.tabContent}>
        {location.status === "loading" && <LoadingState label="Locating definition…" />}
        {location.status === "error" && (
          <EmptyState title="Couldn't resolve a source location" hint={location.error.message} />
        )}
        {location.status === "success" && !location.data && (
          <EmptyState
            title="No definition location found"
            hint="This symbol has no incoming DEFINES edge — unusual for extracted code."
          />
        )}
        {location.status === "success" && location.data && (
          <section className={styles.block}>
            <h4 className={styles.blockTitle}>Defined at</h4>
            <p className={styles.sourceLocation}>
              <span className="mono">{location.data.file}</span>
              {location.data.line_start && (
                <span className={styles.lineRange}>
                  {" "}
                  lines {location.data.line_start}
                  {location.data.line_end && location.data.line_end !== location.data.line_start ? `–${location.data.line_end}` : ""}
                </span>
              )}
            </p>
            <p className={styles.note}>
              The API serves structural facts and evidence locations, not raw file contents — this points at where the
              symbol lives rather than rendering it inline.
            </p>
            {githubBlobUrl(node.repo, location.data.file, location.data.line_start, location.data.line_end) && (
              <a
                className={styles.ghLink}
                href={githubBlobUrl(node.repo, location.data.file, location.data.line_start, location.data.line_end)!}
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub ↗
              </a>
            )}
          </section>
        )}
      </div>
    );
  }

  const prop = TEXT_PROPERTY_BY_TYPE[node.type];
  const text = prop ? (node.properties[prop] as string | undefined) : undefined;

  if (!text) {
    return (
      <div className={styles.tabContent}>
        <EmptyState
          title="No source document for this entity"
          hint={node.type === "File" ? "This File node has no body text — see its Relationships tab for defined symbols." : undefined}
        />
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <section className={styles.block}>
        <h4 className={styles.blockTitle}>{prop === "message" ? "Commit message" : prop === "statement" ? "Extracted claim" : "Body"}</h4>
        <pre className={styles.sourceText}>{text}</pre>
      </section>
      {node.type === "Concept" && typeof node.properties.evidence_quote === "string" && (
        <section className={styles.block}>
          <h4 className={styles.blockTitle}>Supporting quote</h4>
          <blockquote className={styles.quote}>{node.properties.evidence_quote}</blockquote>
        </section>
      )}
    </div>
  );
}
