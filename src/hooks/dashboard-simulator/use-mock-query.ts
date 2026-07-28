import { useEffect, useState } from "react";

/**
 * Simulates the latency of a real network query so components are built
 * against loading states from day one.
 */
export function useMockQuery<T>(compute: () => T, deps: unknown[], delay = 400) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        setData(compute());
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Erreur inconnue"));
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, error };
}
