"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useResource<T>(fetcher: () => Promise<T>, enabled = true) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
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
        setData(d);
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

  return { data, error, loading, reload, setData };
}
