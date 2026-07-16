"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

export function useResource<T>(fetcher: () => Promise<T>, enabled = true) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(enabled);

  const requestId = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    const isStale = () => !mounted.current || id !== requestId.current;
    setLoading(true);
    fetcherRef
      .current()
      .then((d) => {
        if (isStale()) return;
        setDataState(d);
        setError(null);
      })
      .catch((e: Error) => {
        if (isStale()) return;
        setError(e);
      })
      .finally(() => {
        if (isStale()) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (enabled) reload();
    else setLoading(false);
  }, [reload, enabled]);

  const setData = useCallback<Dispatch<SetStateAction<T | null>>>((action) => {
    // Invalida qualquer fetch em voo (bump do requestId) e encerra o loading —
    // senão o `.finally` do fetch invalidado nunca roda setLoading(false).
    requestId.current += 1;
    setLoading(false);
    setDataState(action);
  }, []);

  return { data, error, loading, reload, setData };
}
