"use client";

import { useEffect } from "react";

import { enablePush, pushStatus } from "@/lib/push";

/** Refaz o registro deste aparelho a cada abertura do app, quando a permissão já foi
 *  dada. O POST é um upsert idempotente e cobre os casos em que o servidor perdeu o
 *  endpoint: logout (que devolve a subscription) seguido de login, e rotação feita
 *  pelo próprio navegador. Não cobre a subscription que o push service matou (404/410)
 *  mas o navegador ainda devolve: ela é regravada e cai de novo na varredura. */
export function PushSync() {
  useEffect(() => {
    if (pushStatus() !== "granted") return;
    // Workaround consciente: falha aqui não interrompe ninguém e a próxima abertura
    // tenta de novo — só fica no console para diagnóstico.
    enablePush().catch((e) => console.warn("[push] re-registro falhou", e));
  }, []);

  return null;
}
