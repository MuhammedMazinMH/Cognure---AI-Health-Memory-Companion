// Small fetch-on-mount hook shared by every data screen.
// Mirrors the web app's pattern (fetch in useEffect with loading/error state)
// and adds pull-to-refresh support via `refetch`.

import { useCallback, useEffect, useRef, useState } from "react";

interface ApiDataState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApiData<T>(fetcher: () => Promise<T>): ApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fetcher without re-triggering the mount effect.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async (asRefresh: boolean) => {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, refreshing, error, refetch };
}
