"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { toastError } from "@/lib/toast";

import { DEFAULT_NEXT, safeNextPath } from "./next-path";

/** Para onde voltar depois de autenticar: a rota que o 401 guardou, se for segura. */
function getCallbackURL(): string {
  if (typeof window === "undefined") return DEFAULT_NEXT;
  const next = new URLSearchParams(window.location.search).get("next");
  return safeNextPath(next, window.location.origin);
}

/** Tela de login: só Google — e-mail/senha está desligado no `@bloomy/auth`. */
export function useLogin() {
  const [pending, setPending] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    setPending(true);
    try {
      // Sucesso navega pro consentimento do Google (troca de página); só o
      // erro (rede, ou provider sem credenciais configuradas) chega aqui.
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: getCallbackURL(),
      });
      if (error) {
        setPending(false);
        toastError(error, "Não foi possível continuar com o Google. Tente de novo.");
      }
    } catch (e) {
      setPending(false);
      toastError(e, "Não foi possível continuar com o Google. Tente de novo.");
    }
  }, []);

  return { pending, signInWithGoogle };
}
