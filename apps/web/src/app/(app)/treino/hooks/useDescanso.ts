"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clampRest, loadRestPrefs, type RestPrefs, saveRestPrefs, tickRest } from "./rest";

export function useDescanso() {
  const [prefs, setPrefs] = useState<RestPrefs>(() => loadRestPrefs());
  const [left, setLeft] = useState<number | null>(null); // null = descanso inativo
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

  const start = useCallback(() => {
    if (!prefs.auto) return;
    clear();
    setLeft(prefs.seconds);
    timer.current = setInterval(() => {
      setLeft((v) => {
        const next = tickRest(v);
        if (next === null) clear();
        return next;
      });
    }, 1000);
  }, [prefs.auto, prefs.seconds, clear]);

  // Ajusta o descanso corrente e o default (persistido).
  const adjust = useCallback((delta: number) => {
    setPrefs((p) => {
      const np = { ...p, seconds: clampRest(p.seconds + delta) };
      saveRestPrefs(np);
      return np;
    });
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
    seconds: prefs.seconds,
    auto: prefs.auto,
    start,
    stop,
    adjust,
    setAuto,
  };
}
