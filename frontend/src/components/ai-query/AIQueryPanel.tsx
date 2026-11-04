import { useState } from "react";
import { api, ApiError } from "../../api/client";
import type { AskAnswer } from "../../types/api";
import { useAppState } from "../../state/AppState";
import { NodeTypeBadge } from "../common/Badge";
import { Spinner } from "../common/StateViews";
import styles from "./AIQueryPanel.module.css";

const EXAMPLE_QUESTIONS = [
  "Why does this component exist?",
  "What depends on this function?",
  "Which PR introduced this behavior?",
  "What could break if I modify this?",
  "Find the original discussion behind this design decision.",
];

interface Turn {
  question: string;
  status: "loading" | "error" | "success";
  answer?: AskAnswer;
  error?: string;
}

export function AIQueryPanel() {
  const { state, focusNode } = useAppState();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  async function ask(q: string) {
    if (!q.trim()) return;
    setQuestion("");
    setTurns((prev) => [{ question: q, status: "loading" }, ...prev]);
    try {
      const answer = await api.ask({ question: q, repo: state.repo });
      setTurns((prev) => prev.map((t, i) => (i === 0 ? { ...t, status: "success", answer } : t)));
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : err instanceof Error ? err.message : String(err);
      setTurns((prev) => prev.map((t, i) => (i === 0 ? { ...t, status: "error", error: message } : t)));
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.inputArea}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
        >
          <textarea
            className={styles.input}
            placeholder="Ask about this codebase — architecture, history, impact, rationale…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
            rows={2}
          />
          <button type="submit" className={styles.submit} disabled={!question.trim()}>
            Ask
          </button>
        </form>
        {turns.length === 0 && (
          <div className={styles.examples}>
            {EXAMPLE_QUESTIONS.map((q) => (
              <button key={q} type="button" className={styles.exampleChip} onClick={() => void ask(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.history}>
        {turns.map((turn, i) => (
          <AnswerCard key={i} turn={turn} onCitationClick={focusNode} />
        ))}
      </div>
    </div>
  );
}

function AnswerCard({ turn, onCitationClick }: { turn: Turn; onCitationClick: (id: string) => void }) {
  return (
    <div className={styles.card}>
      <div className={styles.question}>{turn.question}</div>
      {turn.status === "loading" && (
        <div className={styles.loadingRow}>
          <Spinner size={13} />
          <span>Thinking…</span>
        </div>
      )}
      {turn.status === "error" && <div className={styles.errorRow}>{turn.error}</div>}
      {turn.status === "success" && turn.answer && (
        <>
          {turn.answer.degraded && <div className={styles.degradedNotice}>AI answering is unavailable right now</div>}
          <p className={styles.answerText}>{turn.answer.answer}</p>
          {turn.answer.citations.length > 0 && (
            <div className={styles.citations}>
              <div className={styles.citationsLabel}>Sources</div>
              {turn.answer.citations.map((c, i) => (
                <button key={i} type="button" className={styles.citation} onClick={() => onCitationClick(c.node_id)}>
                  <NodeTypeBadge type={c.type} />
                  <span className={styles.citationKey}>{c.natural_key}</span>
                  <span className={styles.citationQuote}>"{c.quote}"</span>
                </button>
              ))}
            </div>
          )}
          {turn.answer.dropped_citations > 0 && (
            <div className={styles.droppedNotice}>
              {turn.answer.dropped_citations} citation{turn.answer.dropped_citations > 1 ? "s" : ""} couldn't be
              verified against retrieved evidence and were withheld.
            </div>
          )}
          {turn.answer.unable_to_answer && turn.answer.citations.length === 0 && !turn.answer.degraded && (
            <div className={styles.degradedNotice}>The graph doesn't have enough indexed evidence to answer this.</div>
          )}
        </>
      )}
    </div>
  );
}
