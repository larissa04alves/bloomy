"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { CycleState, MethodUpdateInput } from "@/lib/api-types";
import { toastError } from "@/lib/toast";

type CycleResponse = { cycle: CycleState | null };

export function useAtivarCiclo() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = useCallback(() => {
    // O layout lê isCycleEnabled no servidor e a navegação reaproveita o layout em cache: o
    // refresh vem depois do replace para valer na rota nova (antes, a navegação o descartava).
    router.replace("/ciclo");
    router.refresh();
  }, [router]);

  // Quem desativou mantém o método: religar recupera tudo sem pedir os dados de novo.
  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.patch<CycleResponse>("/api/cycle/settings", { enabled: true });
      done();
      return;
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.status === 409) setSheetOpen(true);
      else toastError(e, "Não foi possível ativar o ciclo");
    }
  }, [busy, done]);

  const activate = useCallback(
    // Sem `initial` no sheet a posição sempre vem: o POST recebe o MethodInput completo.
    async (input: MethodUpdateInput) => {
      setBusy(true);
      try {
        await api.post<CycleResponse>("/api/cycle", input);
      } catch (e) {
        setBusy(false);
        toastError(e, "Não foi possível ativar o ciclo");
        return;
      }
      done();
    },
    [done],
  );

  return { sheetOpen, setSheetOpen, busy, start, activate };
}
