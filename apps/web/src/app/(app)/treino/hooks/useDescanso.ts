"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Profile } from "@/lib/api-types";
import {
  clearLegacyAutoRest,
  effectiveAutoRest,
  readLegacyAutoRest,
} from "@/lib/legacy-auto-rest";
import { cancelRestAlarm, scheduleRestAlarm } from "@/lib/rest-alarm";
import { playRestEndTone, primeRestTone, vibrateRestEnd } from "@/lib/rest-alert";
import { toastError } from "@/lib/toast";
import { useLegacyAutoRestMigration } from "@/lib/use-legacy-auto-rest";
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
} from "./rest";

type ActiveRest = { endsAt: number; total: number };

/** Recalcula 4×/s: o número na tela não pode pular um segundo por atraso do timer. */
const TICK_MS = 250;

/** Descanso entre séries. O tempo vem de `endsAt` (hora do fim), não de um contador:
 *  com a tela apagada o JS para, e ao voltar o restante sai certo do relógio. */
export function useDescanso(sessionId: string | null) {
  const [prefs] = useState<RestPrefs>(() => loadRestPrefs());
  const [rest, setRest] = useState<ActiveRest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const {
    data: profileData,
    setData: setProfile,
    reload: reloadProfile,
  } = useResource<{ profile: Profile }>(
    useCallback(() => api.get<{ profile: Profile }>("/api/profile"), []),
  );
  const [legacyAuto] = useState(() => readLegacyAutoRest());
  // Escolha feita sem profile carregado: segura o toggle até a conta refletir.
  const [autoOverride, setAutoOverride] = useState<boolean | null>(null);
  const restAlert = profileData?.profile.restAlert ?? true;
  const auto = effectiveAutoRest(autoOverride, profileData?.profile.autoRest ?? null, legacyAuto);

  const setAuto = useCallback(
    async (next: boolean) => {
      const previous = profileData?.profile.autoRest;
      if (previous === undefined) {
        // Sem profile: o PATCH cria a linha (`ensureProfile`) e o reload a traz.
        if (auto === next) return;
        const previousOverride = autoOverride;
        setAutoOverride(next);
        try {
          await api.patch("/api/profile", { autoRest: next });
          clearLegacyAutoRest();
          reloadProfile();
        } catch (e) {
          setAutoOverride(previousOverride);
          toastError(e, "Não foi possível salvar o descanso automático");
        }
        return;
      }
      if (previous === next && autoOverride === null) return;
      setAutoOverride(null);
      setProfile((d) => d && { profile: { ...d.profile, autoRest: next } });
      try {
        await api.patch("/api/profile", { autoRest: next });
        clearLegacyAutoRest();
      } catch (e) {
        // Volta só este campo, sobre o estado mais recente: outro save em voo fica.
        setProfile((d) => d && { profile: { ...d.profile, autoRest: previous } });
        toastError(e, "Não foi possível salvar o descanso automático");
      }
    },
    [profileData, setProfile, auto, autoOverride, reloadProfile],
  );

  // Com escolha local de pé, a chave antiga não pode sobrescrevê-la ao carregar.
  useLegacyAutoRestMigration(
    autoOverride === null ? (profileData?.profile.autoRest ?? null) : null,
    setAuto,
  );

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
      if (!auto) return;
      primeRestTone(); // dentro do toque em "concluir série"
      const total = clampRest(seconds ?? prefs.seconds);
      const t = Date.now();
      const next = { endsAt: t + total * 1000, total };
      setNow(t);
      setRest(next);
      persist(next);
      if (restAlert) void scheduleRestAlarm(next.endsAt);
    },
    [auto, prefs.seconds, persist, restAlert],
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

  return {
    resting: rest !== null,
    left: rest ? (restLeft(rest.endsAt, now) ?? 0) : 0,
    seconds: rest?.total ?? REST_DEFAULT,
    auto,
    start,
    stop,
    adjust,
    setAuto,
  };
}
