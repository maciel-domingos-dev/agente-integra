"use client";
import { useCallback, useEffect, useState } from "react";

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(
    () => fn().then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message)).finally(() => setLoading(false)),
    deps,
  );

  useEffect(() => {
    run();
    if (!pollMs) return;
    const id = setInterval(run, pollMs);
    return () => clearInterval(id);
  }, [run, pollMs]);

  return { data, setData, error, loading, reload: run };
}
