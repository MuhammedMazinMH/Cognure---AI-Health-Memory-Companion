// Small fetch-on-mount hook shared by every data screen.
// Mirrors the web app's pattern (fetch in useEffect with loading/error state)
// and adds pull-to-refresh support via `refetch`.

import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { ApiError } from "./api";

interface ApiDataState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Turns a thrown error into a user-facing message, distinguishing a genuine
 * connectivity failure (fetch throws a TypeError) from a server-side error.
 */
function toMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof TypeError) {
    // React Native fetch throws "Network request failed" when offline.
    return "No internet connection. Check your network and try again.";
  }
  return err instanceof Error ? err.message : "Something went wrong.";
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
      // An expired/invalid session (401) is not a retryable error — send the
      // user back to login instead of showing a generic retry state.
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(toMessage(err));
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
