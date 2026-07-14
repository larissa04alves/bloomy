"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clampRest,
  loadRestPrefs,
  REST_DEFAULT,
  type RestPrefs,
  saveRestPrefs,
  tickRest,
} from "./rest";

export function useDescanso() {
  const [prefs, setPrefs] = useState<RestPrefs>(() => loadRestPrefs());
  const [left, setLeft] = useState<number | null>(null); // null = descanso inativo
  const [total, setTotal] = useState<number>(REST_DEFAULT); // duração do descanso corrente (anel)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clear();
    setLeft(null);
  }, [clear]);

  // Inicia o descanso. `seconds` = descanso do exercício ativo; sem valor usa o default.
  const start = useCallback(
    (seconds?: number) => {
      if (!prefs.auto) return;
      clear();
      const secs = clampRest(seconds ?? prefs.seconds);
      setTotal(secs);
      setLeft(secs);
      timer.current = setInterval(() => {
        setLeft((v) => {
          const next = tickRest(v);
          if (next === null) clear();
          return next;
        });
      }, 1000);
    },
    [prefs.auto, prefs.seconds, clear],
  );

  // Ajusta o descanso corrente (contagem + anel), sem mexer no default global.
  const adjust = useCallback((delta: number) => {
    setTotal((t) => clampRest(t + delta));
    setLeft((v) => (v === null ? v : clampRest(v + delta)));
  }, []);

  const setAuto = useCallback((auto: boolean) => {
    setPrefs((p) => {
      const np = { ...p, auto };
      saveRestPrefs(np);
      return np;
    });
  }, []);

  useEffect(() => clear, [clear]); // limpa o interval ao desmontar

  return {
    resting: left !== null,
    left: left ?? 0,
    seconds: total,
    auto: prefs.auto,
    start,
    stop,
    adjust,
    setAuto,
  };
}
