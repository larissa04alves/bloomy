"use client";

import { useCallback, useEffect, useState } from "react";

import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push";
import { toastError } from "@/lib/toast";

export function usePushSync() {
  // `null` até montar: no SSR não há `Notification.permission`, e "bloqueada" pintaria o aviso.
  const [permission, setPermission] = useState<PushStatus | null>(null);
  useEffect(() => {
    setPermission(pushStatus());
  }, []);

  const syncPush = useCallback(async (anyEnabled: boolean) => {
    try {
      if (anyEnabled) setPermission(await enablePush());
      else await disablePush();
    } catch (e) {
      // A preferência já foi salva; o que falhou foi só o registro do aparelho.
      toastError(
        e,
        anyEnabled
          ? "Não foi possível ativar as notificações neste aparelho"
          : "Não foi possível desativar as notificações neste aparelho",
      );
      setPermission(pushStatus());
    }
  }, []);

  return { permission, syncPush };
}
