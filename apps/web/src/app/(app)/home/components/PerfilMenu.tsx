"use client";

import { UserIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bloomy/ui/components/dropdown-menu";

import { authClient } from "@/lib/auth-client";
import { toastError } from "@/lib/toast";

export function PerfilMenu({ name }: { name: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu do perfil"
        className="grid size-11.5 shrink-0 place-items-center rounded-full bg-lilac font-display text-lg font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-lilac-deep focus-visible:ring-offset-2"
      >
        {initial || <UserIcon size={22} weight="fill" />}
      </DropdownMenuTrigger>
      {/* w-44 sobrescreve o w-(--anchor-width) do shadcn: o âncora é um avatar de 46px */}
      <DropdownMenuContent align="end" className="w-44 rounded-card p-1 shadow-card">
        <DropdownMenuItem disabled className="justify-between text-sm">
          Metas <span className="text-xs text-ink-faint">em breve</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="justify-between text-sm">
          Notificações <span className="text-xs text-ink-faint">em breve</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-sm"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              // O better-auth devolve `{ error }` em falha HTTP em vez de lançar —
              // só o erro de rede cai no catch. Sem checar, um 500 mandaria a pessoa
              // pro /login achando que saiu, com a sessão ainda válida.
              const { error } = await authClient.signOut();
              if (error) {
                setSigningOut(false);
                toastError(error, "Não foi possível sair. Tente de novo.");
                return;
              }
              router.replace("/login");
              // sem reset no sucesso: a navegação desmonta o menu antes que o
              // rótulo tenha chance de piscar de volta pra "Sair".
            } catch (e) {
              setSigningOut(false);
              toastError(e, "Não foi possível sair. Tente de novo.");
            }
          }}
        >
          {signingOut ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
