"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { disablePush } from "@/lib/push";
import { toastError } from "@/lib/toast";

export function useSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      // Celular compartilhado: a próxima conta não recebe os lembretes desta; falha não barra o logout.
      await disablePush().catch(() => {});
      // better-auth devolve `{ error }` em falha HTTP em vez de lançar.
      const { error } = await authClient.signOut();
      if (error) {
        setSigningOut(false);
        toastError(error, "Não foi possível sair. Tente de novo.");
        return;
      }
      router.replace("/login");
      // Sem reset no sucesso: a navegação desmonta antes de o rótulo voltar a "Sair".
    } catch (e) {
      setSigningOut(false);
      toastError(e, "Não foi possível sair. Tente de novo.");
    }
  }, [router]);

  return { signingOut, signOut };
}
