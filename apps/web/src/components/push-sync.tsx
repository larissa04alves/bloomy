"use client";

import { useEffect } from "react";

import { resyncPush } from "@/lib/push";

/** Refaz o registro deste aparelho a cada abertura do app, quando a permissão já foi
 *  dada. O POST é um upsert idempotente e cobre os casos em que o servidor perdeu o
 *  endpoint: logout (que devolve a subscription) seguido de login, e rotação feita
 *  pelo próprio navegador. Não cobre a subscription que o push service matou (404/410)
 *  mas o navegador ainda devolve: ela é regravada e cai de novo na varredura.
 *
 *  Ligar o ciclo também refaz: com ele desligado e nenhum outro lembrete, o servidor
 *  descartou o endpoint (`wantsPush`), e o layout não remonta ao ativar. */
export function PushSync({ cycleEnabled }: { cycleEnabled: boolean }) {
  useEffect(() => {
    resyncPush();
  }, [cycleEnabled]);

  return null;
}
