"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Profile } from "@/lib/api-types";
import { cancelRestAlarm, scheduleRestAlarm } from "@/lib/rest-alarm";
import { playRestEndTone, primeRestTone, vibrateRestEnd } from "@/lib/rest-alert";
import { useResource } from "@/lib/use-resource";

import {
  clampRest,
  isLateFinish,
  loadActiveRest,
  loadRestPrefs,
  REST_DEFAULT,
  type RestPrefs,
  restLeft,
  saveActiveRest,
  saveRestPrefs,
} from "./rest";

type ActiveRest = { endsAt: number; total: number };

/** Recalcula 4×/s: o número na tela não pode pular um segundo por atraso do timer. */
const TICK_MS = 250;

/** Descanso entre séries. O tempo vem de `endsAt` (hora do fim), não de um contador:
 *  com a tela apagada o JS para, e ao voltar o restante sai certo do relógio. */
export function useDescanso(sessionId: string | null) {
  const [prefs, setPrefs] = useState<RestPrefs>(() => loadRestPrefs());
  const [rest, setRest] = useState<ActiveRest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // "Aviso de fim do descanso" (tela Notificações). Até carregar vale o default, ligado.
  const { data: profileData } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );
  const restAlert = profileData?.profile.restAlert ?? true;

  const persist = useCallback(
    (next: ActiveRest | null) => {
      if (sessionId) saveActiveRest(next ? { sessionId, ...next } : null);
    },
    [sessionId],
  );

  // Recarga ou aba descartada no meio do descanso: retoma o que estava salvo.
  useEffect(() => {
    if (!sessionId) return;
    const t = Date.now();
    const saved = loadActiveRest(sessionId, t);
    if (!saved) {
      setRest(null); // outra sessão: a contagem da anterior não vale aqui
      return;
    }
    setNow(t);
    setRest({ endsAt: saved.endsAt, total: saved.total });
  }, [sessionId]);

  useEffect(() => {
    if (!rest) return;
    const tick = () => {
      const t = Date.now();
      if (restLeft(rest.endsAt, t) !== null) {
        setNow(t);
        return;
      }
      if (restAlert && !isLateFinish(rest.endsAt, t)) {
        playRestEndTone();
        vibrateRestEnd();
      }
      setRest(null);
      persist(null);
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [rest, persist, restAlert]);

  // Pular ou concluir a sessão: o push agendado não deve chegar. (O fim natural, no
  // `tick`, não cancela: o push do mesmo instante é barrado pelo service worker.)
  const stop = useCallback(() => {
    setRest(null);
    persist(null);
    void cancelRestAlarm();
  }, [persist]);

  // Inicia o descanso. `seconds` = descanso do exercício ativo; sem valor usa o default.
  const start = useCallback(
    (seconds?: number) => {
      if (!prefs.auto) return;
      primeRestTone(); // dentro do toque em "concluir série"
      const total = clampRest(seconds ?? prefs.seconds);
      const t = Date.now();
      const next = { endsAt: t + total * 1000, total };
      setNow(t);
      setRest(next);
      persist(next);
      if (restAlert) void scheduleRestAlarm(next.endsAt);
    },
    [prefs.auto, prefs.seconds, persist, restAlert],
  );

  // Ajusta o descanso corrente (contagem + anel), sem mexer no default global.
  const adjust = useCallback(
    (delta: number) => {
      if (!rest) return;
      const t = Date.now();
      const left = clampRest((restLeft(rest.endsAt, t) ?? 0) + delta);
      const next = { endsAt: t + left * 1000, total: clampRest(rest.total + delta) };
      setNow(t);
      setRest(next);
      persist(next);
      if (restAlert) void scheduleRestAlarm(next.endsAt);
    },
    [rest, persist, restAlert],
  );

  const setAuto = useCallback((auto: boolean) => {
    setPrefs((p) => {
      const np = { ...p, auto };
      saveRestPrefs(np);
      return np;
    });
  }, []);

  return {
    resting: rest !== null,
    left: rest ? (restLeft(rest.endsAt, now) ?? 0) : 0,
    seconds: rest?.total ?? REST_DEFAULT,
    auto: prefs.auto,
    start,
    stop,
    adjust,
    setAuto,
  };
}
