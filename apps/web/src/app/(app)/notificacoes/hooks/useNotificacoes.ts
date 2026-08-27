"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Medication, Reminder } from "@/lib/api-types";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push";
import { toastError } from "@/lib/toast";
import { useResource } from "@/lib/use-resource";

export function useNotificacoes() {
  const {
    data: remindersData,
    setData: setReminders,
    error: remindersError,
    reload: reloadReminders,
  } = useResource<{ reminders: Reminder[] }>(
    useCallback(() => api.get<{ reminders: Reminder[] }>("/api/reminders"), []),
  );

  // Os remédios entram só para saber se a linha pode ligar: sem medicação ativa o
  // lembrete não tem horário para derivar e nunca dispararia.
  const {
    data: medsData,
    error: medsError,
    reload: reloadMeds,
  } = useResource<{ medications: Medication[] }>(
    useCallback(() => api.get<{ medications: Medication[] }>("/api/medications"), []),
  );

  // `null` até o primeiro efeito: `Notification.permission` não existe no servidor, e
  // renderizar "bloqueada" no SSR pintaria o aviso coral em quem nunca foi perguntado.
  const [permission, setPermission] = useState<PushStatus | null>(null);
  useEffect(() => {
    setPermission(pushStatus());
  }, []);

  /** A permissão é pedida ao ligar o primeiro toggle — depois da intenção declarada,
   *  que é quando as pessoas aceitam. Desligar o último devolve a subscription: sem
   *  lembrete ligado não há motivo para o servidor guardar o endpoint deste aparelho. */
  const syncPush = useCallback(async (anyEnabled: boolean) => {
    try {
      if (anyEnabled) setPermission(await enablePush());
      else await disablePush();
    } catch (e) {
      // A preferência já foi salva; o que falhou foi só o registro do aparelho.
      toastError(e, "Não foi possível ativar as notificações neste aparelho");
      setPermission(pushStatus());
    }
  }, []);

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const current = remindersData;
      const found = current?.reminders.find((r) => r.id === id);
      if (!current || !found || found.enabled === enabled) return;

      const next = current.reminders.map((r) => (r.id === id ? { ...r, enabled } : r));
      // Otimista: o toggle anda no dedo, não depois do round-trip.
      setReminders({ reminders: next });

      try {
        await api.put(`/api/reminders/${id}`, { enabled });
      } catch (e) {
        setReminders(current);
        toastError(e, "Não foi possível salvar o lembrete");
        return;
      }

      await syncPush(next.some((r) => r.enabled));
    },
    [remindersData, setReminders, syncPush],
  );

  const setTime = useCallback(
    async (id: string, time: string) => {
      const current = remindersData;
      const found = current?.reminders.find((r) => r.id === id);
      if (!current || !found || found.time === time) return;

      setReminders({
        reminders: current.reminders.map((r) => (r.id === id ? { ...r, time } : r)),
      });

      try {
        await api.put(`/api/reminders/${id}`, { time });
      } catch (e) {
        setReminders(current);
        // O 422 ("this reminder has no editable time") só apareceria se a tela abrisse
        // a sheet para água, remédios ou consultas — o toast entrega o texto do servidor.
        toastError(e, "Não foi possível salvar o horário");
      }
    },
    [remindersData, setReminders],
  );

  const [sheetId, setSheetId] = useState<string | null>(null);

  return {
    reminders: remindersData?.reminders ?? [],
    hasMedication: (medsData?.medications ?? []).some((m) => m.active),
    permission,

    // `ready` só com os DOIS recursos em mãos: sem os remédios a linha de remédios
    // piscaria habilitada antes de descobrir que não há cadastro.
    ready: remindersData !== null && medsData !== null,
    error: remindersError ?? medsError,
    reload: useCallback(() => {
      reloadReminders();
      reloadMeds();
    }, [reloadReminders, reloadMeds]),

    setEnabled,
    setTime,
    sheetId,
    openSheet: useCallback((id: string) => setSheetId(id), []),
    setSheetOpen: useCallback(
      (id: string, open: boolean) => setSheetId(open ? id : null),
      [],
    ),
  };
}
