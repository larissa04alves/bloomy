"use client";

import { useEffect } from "react";

import { enablePush, pushStatus } from "@/lib/push";

/** Refaz o registro deste aparelho a cada abertura do app, quando a permissão já foi
 *  dada. O POST é um upsert idempotente e cobre os casos em que o servidor perdeu o
 *  endpoint: logout (que devolve a subscription) seguido de login, limpeza de uma
 *  subscription morta e rotação feita pelo próprio navegador. */
export function PushSync() {
  useEffect(() => {
    if (pushStatus() !== "granted") return;
    // Workaround consciente: falha aqui não interrompe ninguém e a próxima abertura
    // tenta de novo — só fica no console para diagnóstico.
    enablePush().catch((e) => console.warn("[push] re-registro falhou", e));
  }, []);

  return null;
}
