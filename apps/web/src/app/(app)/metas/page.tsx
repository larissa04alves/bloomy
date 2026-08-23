"use client";

import {
  ArrowLeftIcon,
  BarbellIcon,
  DropIcon,
  ForkKnifeIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { MetaCard } from "./components/MetaCard";
import { MetaSheet } from "./components/MetaSheet";
import { MetasError } from "./components/MetasError";
import { MetasSkeleton } from "./components/MetasSkeleton";
import { metaLabel } from "./hooks/format";
import { useMetas } from "./hooks/useMetas";

export default function MetasPage() {
  const metas = useMetas();

  if (!metas.ready) {
    if (metas.error) return <MetasError onRetry={metas.reload} />;
    return <MetasSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-center justify-between">
        <Link
          href="/home"
          aria-label="Voltar"
          className="grid size-9.5 place-items-center rounded-control bg-lilac-tint-soft text-lilac-deep"
        >
          <ArrowLeftIcon size={18} weight="bold" />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink">
          Minhas metas
        </h1>
        <span className="size-9.5" aria-hidden="true" />
      </header>

      <div className="flex flex-col gap-3">
        <MetaCard
          tone="lilac"
          icon={<DropIcon size={22} weight="fill" />}
          title="Hidratação"
          meta={metaLabel("water", metas.waterGoalMl)}
          pill={`${metas.waterGoalMl} ml`}
          onEdit={() => metas.openSheet("water")}
        />
        <MetaCard
          tone="green"
          icon={<ForkKnifeIcon size={22} weight="fill" />}
          title="Alimentação"
          meta={metaLabel("meals", metas.mealsTarget)}
          pill={String(metas.mealsTarget)}
          onEdit={() => metas.openSheet("meals")}
        />
        <MetaCard
          tone="pink"
          icon={<BarbellIcon size={22} weight="fill" />}
          title="Treino"
          meta={metaLabel("workout", metas.workoutTarget)}
          pill={String(metas.workoutTarget)}
          onEdit={() => metas.openSheet("workout")}
        />
      </div>

      <MetaSheet
        open={metas.isOpen("water")}
        onOpenChange={(open) => metas.setSheetOpen("water", open)}
        title="Hidratação"
        tone="lilac"
        icon={<DropIcon size={22} weight="fill" />}
        {...metas.sheets.water}
      />

      <MetaSheet
        open={metas.isOpen("meals")}
        onOpenChange={(open) => metas.setSheetOpen("meals", open)}
        title="Alimentação"
        tone="green"
        icon={<ForkKnifeIcon size={22} weight="fill" />}
        {...metas.sheets.meals}
      />

      <MetaSheet
        open={metas.isOpen("workout")}
        onOpenChange={(open) => metas.setSheetOpen("workout", open)}
        title="Treino"
        tone="pink"
        icon={<BarbellIcon size={22} weight="fill" />}
        {...metas.sheets.workout}
      />
    </div>
  );
}
