"use client";

import { CaretRightIcon, FlowerLotusIcon, PencilSimpleIcon, PillIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { IconChip } from "@/components/icon-chip";
import { ToggleSwitch } from "@/components/toggle-switch";
import { ATIVAR_HREF } from "@/lib/cycle";

import type { CicloStatus } from "../hooks/usePerfil";

const CARD = "flex items-center gap-3 rounded-card bg-white p-4 shadow-card";

export function CicloSection({
  status,
  methodPill,
  busy,
  onRetry,
  onEditMethod,
  onEnabledChange,
  onDelete,
}: {
  status: CicloStatus;
  methodPill: string | null;
  busy: boolean;
  onRetry: () => void;
  onEditMethod: () => void;
  onEnabledChange: (next: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <section id="ciclo" className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="font-display text-base font-bold text-ink">Ciclo</h2>

      {status === "loading" ? (
        <div className="h-20 animate-pulse rounded-card bg-lilac-tint-soft" />
      ) : status === "error" ? (
        <div className={CARD}>
          <IconChip tone="peach" icon={<FlowerLotusIcon size={22} weight="fill" />} size="lg" />
          <span className="min-w-0 flex-1 text-sm font-semibold text-ink-read">
            Não foi possível carregar o ciclo.
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-11 shrink-0 items-center rounded-control bg-peach-tint px-3 text-sm font-bold text-peach-deep"
          >
            Tentar de novo
          </button>
        </div>
      ) : status === "inactive" ? (
        <Link href={ATIVAR_HREF} className={CARD}>
          <IconChip tone="peach" icon={<FlowerLotusIcon size={22} weight="fill" />} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="font-display text-base font-bold text-ink">Acompanhar ciclo</span>
            <span className="truncate text-xs font-semibold text-ink-read">
              menstruação, sintomas e pílula
            </span>
          </div>
          <CaretRightIcon size={18} weight="bold" className="text-ink-faint" />
        </Link>
      ) : (
        <>
          {status === "on" && methodPill ? (
            <div className={CARD}>
              <IconChip tone="peach" icon={<PillIcon size={22} weight="fill" />} size="lg" />
              <span className="min-w-0 flex-1 font-display text-base font-bold text-ink">Método</span>
              <button
                type="button"
                onClick={onEditMethod}
                aria-label={`Editar método, ${methodPill}`}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-peach-tint px-3 text-sm font-bold text-peach-deep"
              >
                {methodPill}
                <PencilSimpleIcon size={14} weight="bold" />
              </button>
            </div>
          ) : null}
          <div className={CARD}>
            <IconChip tone="peach" icon={<FlowerLotusIcon size={22} weight="fill" />} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-base font-bold text-ink">Ciclo ativo</span>
              <span className="truncate text-xs font-semibold text-ink-read">
                desligado, a aba some e os dados ficam
              </span>
            </div>
            <ToggleSwitch
              checked={status === "on"}
              onCheckedChange={onEnabledChange}
              label="Ciclo ativo"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col rounded-card bg-white p-2 shadow-card">
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-3 rounded-control px-2 py-3 text-left text-sm font-bold text-ink-read"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-[14px] bg-lilac-tint-soft text-ink-read">
                <TrashIcon size={18} weight="fill" />
              </span>
              Apagar dados do ciclo
            </button>
          </div>
        </>
      )}
    </section>
  );
}
