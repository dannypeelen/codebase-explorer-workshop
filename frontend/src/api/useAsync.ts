import { useEffect, useRef, useState } from "react";
import { ApiError } from "./client";

export type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "error"; data?: undefined; error: ApiError | Error }
  | { status: "success"; data: T; error?: undefined };

/**
 * Runs `fn` whenever `deps` change, aborting the previous in-flight
 * request first — every panel that fetches on selection change
 * (inspector, impact, neighbors) needs this so clicking quickly through
 * nodes can't show a stale response that resolves after a newer one.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: React.DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading" });

    fn(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
