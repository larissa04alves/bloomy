"use client";

import { FlowerLotusIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { CycleMethodSheet } from "@/components/cycle-method-sheet";
import { CyclePrivacyCard } from "@/components/cycle-privacy-card";

import { useAtivarCiclo } from "./hooks/useAtivarCiclo";

export default function AtivarCicloPage() {
  const a = useAtivarCiclo();

  return (
    <div className="flex flex-1 flex-col gap-5 px-5.5 pt-10 pb-8">
      <div className="mx-auto grid size-28 place-items-center rounded-full bg-peach-tint text-peach-deep">
        <FlowerLotusIcon size={56} weight="fill" />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          Acompanhar seu ciclo?
        </h1>
        <p className="text-sm font-semibold text-ink-read">
          Entenda melhor o seu corpo: anote como você está a cada dia e saiba quando o próximo
          ciclo deve chegar.
        </p>
      </div>
      <CyclePrivacyCard />
      <div className="mt-auto flex flex-col gap-3">
        <button
          type="button"
          disabled={a.busy}
          onClick={() => void a.start()}
          className="w-full rounded-full bg-peach py-3.5 font-display font-bold text-white shadow-btn-peach disabled:opacity-60"
        >
          Ativar ciclo
        </button>
        <Link
          href="/home"
          className="min-h-11 py-3 text-center text-sm font-bold text-ink-read"
        >
          Agora não
        </Link>
      </div>

      <CycleMethodSheet
        open={a.sheetOpen}
        onOpenChange={a.setSheetOpen}
        saving={a.busy}
        onSubmit={(input) => void a.activate(input)}
      />
    </div>
  );
}
