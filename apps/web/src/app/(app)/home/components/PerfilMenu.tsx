"use client";

import {
  BellIcon,
  SignOutIcon,
  TargetIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bloomy/ui/components/dropdown-menu";

import { Avatar } from "@/components/avatar";
import { useSignOut } from "@/lib/use-sign-out";

/** Chip de ícone de cada item: quadrado tint com o ícone na variante profunda
 *  do matiz (Regra do Tint + Profundo). */
const CHIP = "grid size-7 shrink-0 place-items-center rounded-xl";
const ITEM = "gap-2.5 rounded-control px-2 py-2.5 text-sm font-semibold";

export function PerfilMenu({ name, image }: { name: string | null; image: string | null }) {
  const { signingOut, signOut } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menu do perfil"
        className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-lilac-deep focus-visible:ring-offset-2"
      >
        <Avatar key={image ?? "none"} name={name} image={image} size="lg" />
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
          <span aria-hidden="true" className="contents">
            <Avatar key={image ?? "none"} name={name} image={image} size="sm" />
          </span>
          <span className="block min-w-0 truncate font-display text-sm font-bold text-ink">
            {name ?? "Seu perfil"}
          </span>
        </div>

        <div className="p-2">
          <DropdownMenuItem render={<Link href="/perfil" />} className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <UserCircleIcon size={16} weight="fill" />
            </span>
            Perfil
          </DropdownMenuItem>

          <DropdownMenuItem render={<Link href="/metas" />} className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <TargetIcon size={16} weight="fill" />
            </span>
            Metas
          </DropdownMenuItem>

          <DropdownMenuItem render={<Link href="/notificacoes" />} className={ITEM}>
            <span className={`${CHIP} bg-lilac-tint-soft text-lilac-deep`}>
              <BellIcon size={16} weight="fill" />
            </span>
            Notificações
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-2 my-1.5 bg-hairline-soft" />

          {/* variant="destructive" não é só cor: ele desliga a regra
              `focus:**:text-accent-foreground` do item, que pintaria o ícone do
              chip de lilás no foco. O fundo do foco vem por cima, em coral. */}
          <DropdownMenuItem
            variant="destructive"
            className={`${ITEM} text-coral focus:bg-coral-tint focus:text-coral`}
            disabled={signingOut}
            onClick={() => void signOut()}
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
