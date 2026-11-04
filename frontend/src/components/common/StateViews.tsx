import type { ReactNode } from "react";
import { ApiError } from "../../api/client";
import styles from "./StateViews.module.css";

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className={styles.loading}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: ReactNode }) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <p className={styles.emptyTitle}>{title}</p>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const isApiError = error instanceof ApiError;
  const title = isApiError && error.status === 0 ? "Can't reach the API" : isApiError ? `Request failed (${error.status})` : "Something went wrong";
  return (
    <div className={styles.error}>
      <p className={styles.errorTitle}>{title}</p>
      <p className={styles.errorDetail}>{error.message}</p>
      {onRetry && (
        <button type="button" className={styles.retryButton} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
