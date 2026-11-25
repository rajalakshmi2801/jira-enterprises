import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "./format";

interface AsyncResult {
  key: string;
  error?: string;
}

/**
 * Small data-loading hook. Re-fetches whenever `deps` change or `reload()`
 * is called, and keeps showing the previous data while reloading.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown> = []
) {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [result, setResult] = useState<AsyncResult | null>(null);

  const key = `${JSON.stringify(deps)}|${tick}`;

  useEffect(() => {
    let active = true;

    loader()
      .then((value) => {
        if (!active) return;

        setData(value);
        setResult({ key });
      })
      .catch((error: unknown) => {
        if (!active) return;

        setResult({ key, error: getErrorMessage(error) });
      });

    return () => {
      active = false;
    };
    // The loader is intentionally re-created on every render; `key`
    // captures the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return {
    data,
    loading: result?.key !== key,
    error: result?.key === key ? result.error : undefined,
    reload,
  };
}
