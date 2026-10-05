import { useCallback, useEffect, useRef, useState } from "react";

type Settled<T> = { request: string; data: T | undefined; error: unknown };

/**
 * Runs `fetcher` on mount and whenever `key` changes, aborting the previous request.
 * `key` must encode every input the fetcher reads. Data from the previous key stays
 * visible while the next one loads.
 */
export function useQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>) {
  const [nonce, setNonce] = useState(0);
  const request = `${key}#${nonce}`;
  const [settled, setSettled] = useState<Settled<T>>({ request: "", data: undefined, error: null });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    const controller = new AbortController();
    fetcherRef
      .current(controller.signal)
      .then((data) => setSettled({ request, data, error: null }))
      .catch((error: unknown) => {
        if ((error as Error)?.name === "AbortError") return;
        setSettled((previous) => ({ request, data: previous.data, error }));
      });
    return () => controller.abort();
  }, [request]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setSettled((previous) => ({ ...previous, data })), []);

  const loading = settled.request !== request;
  return { data: settled.data, error: loading ? null : settled.error, loading, reload, setData };
}
