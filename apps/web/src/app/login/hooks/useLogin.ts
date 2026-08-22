"use client";

import { useCallback, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { toastError } from "@/lib/toast";

const DEFAULT_CALLBACK = "/home";

/**
 * `?next=` vem do redirect de 401 em `lib/api.ts`. Só aceita caminho relativo:
 * um `next` absoluto (ex.: `//evil.com`) abriria um redirect aberto depois do
 * login com o Google.
 */
function getCallbackURL(): string {
  if (typeof window === "undefined") return DEFAULT_CALLBACK;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") ? next : DEFAULT_CALLBACK;
}

/** Tela de login: só Google por agora (issue #4) — e-mail/senha fica pra depois. */
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
