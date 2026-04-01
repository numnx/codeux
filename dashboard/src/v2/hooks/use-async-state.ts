import { useCallback, useState } from "preact/hooks";

export function useAsyncState<T>(initialValue: T | null = null) {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (asyncFunction: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFunction();
      setData(result);
      return result;
    } catch (e) {
      const currentError = e instanceof Error ? e : new Error(String(e));
      setError(currentError);
      throw currentError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute, setData, setError };
}
