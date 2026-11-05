"use client";

import { useEffect, useRef } from "react";

import { clearLegacyAutoRest, legacyAutoRestStep, readLegacyAutoRest } from "./legacy-auto-rest";

/** `save` apaga a chave só quando o PATCH dá certo: escolha posterior nunca é sobrescrita. */
export function useLegacyAutoRestMigration(
  accountAutoRest: boolean | null,
  save: (value: boolean) => unknown,
): void {
  const done = useRef(false);
  useEffect(() => {
    if (accountAutoRest === null || done.current) return;
    done.current = true;
    const step = legacyAutoRestStep(readLegacyAutoRest(), accountAutoRest);
    if (step.kind === "clear") clearLegacyAutoRest();
    else if (step.kind === "save") void save(step.value);
  }, [accountAutoRest, save]);
}
