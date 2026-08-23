"use client";

import {
  BellIcon,
  SignOutIcon,
  TargetIcon,
  UserIcon,
} from "@phosphor-icons/react";
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
      {/* w-56 sobrescreve o w-(--anchor-width) do shadcn: o âncora é um avatar de 46px */}
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-card border border-hairline p-1.5 shadow-card"
      >
        {name ? (
          <>
            <div className="truncate px-2.5 py-1.5 font-display text-sm font-bold text-ink">
              {name}
            </div>
            <DropdownMenuSeparator className="bg-hairline" />
          </>
        ) : null}

        <DropdownMenuItem
          disabled
          className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold focus:bg-lilac-tint-soft"
        >
          <TargetIcon size={18} weight="fill" />
          Metas
          <span className="ml-auto text-xs text-ink-faint">em breve</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled
          className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold focus:bg-lilac-tint-soft"
        >
          <BellIcon size={18} weight="fill" />
          Notificações
          <span className="ml-auto text-xs text-ink-faint">em breve</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-hairline" />

        <DropdownMenuItem
          className="gap-2.5 rounded-control px-2.5 py-2.5 text-sm font-semibold text-coral focus:bg-coral-tint focus:text-coral"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
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
          <SignOutIcon size={18} weight="fill" />
          {signingOut ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
