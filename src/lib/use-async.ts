import { useCallback, useEffect, useRef, useState } from "react";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

type Settled<T> = { sig: string; data: T | null; error: string | null };

/**
 * `load` fonksiyonunu çalıştırır; `deps` değişince tekrar çalıştırır.
 * Yeni istek sürerken önceki veri ekranda kalır (`loading` true olur).
 * Ekran kapandıktan ya da bağımlılık değiştikten sonra gelen eski cevabı yok sayar.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({
    sig: "",
    data: null,
    error: null,
  });
  const loadRef = useRef(load);

  const sig = JSON.stringify([...deps, tick]);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ sig, data, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSettled((prev) => ({
          sig,
          data: prev.data,
          error: e instanceof Error ? e.message : String(e),
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [sig]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = settled.sig !== sig;
  return {
    data: settled.data,
    error: loading ? null : settled.error,
    loading,
    reload,
  };
}
