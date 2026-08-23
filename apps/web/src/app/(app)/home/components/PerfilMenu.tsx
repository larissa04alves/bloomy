"use client";

import {
  BellIcon,
  SignOutIcon,
  TargetIcon,
  UserIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
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

/** Chip de ícone de cada item: quadrado tint com o ícone na variante profunda
 *  do matiz (Regra do Tint + Profundo). */
const CHIP = "grid size-7 shrink-0 place-items-center rounded-xl";
const ITEM = "gap-2.5 rounded-control px-2 py-2.5 text-sm font-semibold";

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
      {/* w-56 sobrescreve o w-(--anchor-width) do shadcn: o âncora é um avatar de 46px.
          O resto desfaz o vestido shadcn — sombra cinza, ring, canto reto — e devolve
          card do Bloomy: raio card-lg, sombra lilás e faixa tint sangrando nas bordas
          (daí p-0 + overflow-hidden, em vez do padding no painel). */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 overflow-hidden rounded-card-lg bg-white p-0 shadow-[0_16px_34px_rgba(120,86,164,0.24)] ring-0"
      >
        <div className="flex items-center gap-2.5 bg-lilac-tint px-3.5 py-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-lilac font-display text-sm font-bold text-white"
          >
            {initial || <UserIcon size={16} weight="fill" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-bold text-ink">
              {name ?? "Seu perfil"}
            </span>
            {/* Sem nome na sessão o título já diz "Seu perfil" — repetir aqui
                deixaria a faixa com a mesma frase duas vezes. */}
            {name ? (
              <span className="block text-xs font-bold text-lilac-deep">
                Seu perfil
              </span>
            ) : null}
          </span>
        </div>

        <div className="p-2">
          <DropdownMenuItem render={<Link href="/metas" />} className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <TargetIcon size={16} weight="fill" />
            </span>
            Metas
          </DropdownMenuItem>

          <DropdownMenuItem disabled className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <BellIcon size={16} weight="fill" />
            </span>
            Notificações
            <span className="ml-auto text-xs font-bold text-ink-faint">
              em breve
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-2 my-1.5 bg-hairline-soft" />

          {/* variant="destructive" não é só cor: ele desliga a regra
              `focus:**:text-accent-foreground` do item, que pintaria o ícone do
              chip de lilás no foco. O fundo do foco vem por cima, em coral. */}
          <DropdownMenuItem
            variant="destructive"
            className={`${ITEM} text-coral focus:bg-coral-tint focus:text-coral`}
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
            <span className={`${CHIP} bg-coral-tint text-coral`}>
              <SignOutIcon size={16} weight="fill" />
            </span>
            {signingOut ? "Saindo…" : "Sair"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
