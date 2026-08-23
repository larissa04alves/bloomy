"use client";

import {
  ArrowLeftIcon,
  BarbellIcon,
  DropIcon,
  ForkKnifeIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { MetaCard } from "./components/MetaCard";
import { MetaSheet } from "./components/MetaSheet";
import { MetasError } from "./components/MetasError";
import { MetasSkeleton } from "./components/MetasSkeleton";
import { metaLabel, portionHint, type MetaDomain } from "./hooks/format";
import { useMetas } from "./hooks/useMetas";

export default function MetasPage() {
  const metas = useMetas();
  const [sheet, setSheet] = useState<MetaDomain | null>(null);

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
          onEdit={() => setSheet("water")}
        />
        <MetaCard
          tone="green"
          icon={<ForkKnifeIcon size={22} weight="fill" />}
          title="Alimentação"
          meta={metaLabel("meals", metas.mealsTarget)}
          pill={String(metas.mealsTarget)}
          onEdit={() => setSheet("meals")}
        />
        <MetaCard
          tone="pink"
          icon={<BarbellIcon size={22} weight="fill" />}
          title="Treino"
          meta={metaLabel("workout", metas.workoutTarget)}
          pill={String(metas.workoutTarget)}
          onEdit={() => setSheet("workout")}
        />
      </div>

      <MetaSheet
        open={sheet === "water"}
        onOpenChange={(open) => setSheet(open ? "water" : null)}
        title="Hidratação"
        tone="lilac"
        icon={<DropIcon size={22} weight="fill" />}
        fields={[
          {
            key: "goalMl",
            label: "Meta do dia",
            value: metas.waterGoalMl,
            min: 500,
            max: 5000,
            step: 100,
            unit: "ml",
          },
          {
            key: "portionMl",
            label: "Cada porção",
            value: metas.waterPortionMl,
            min: 100,
            // 2000 ml acompanha o stepper do modal de água: garrafa de 1,5 L e
            // garrafão de 2 L são porções reais de quem enche uma vez e bebe o dia.
            max: 2000,
            step: 50,
            unit: "ml",
          },
        ]}
        hint={(v) => portionHint(v.goalMl!, v.portionMl!)}
        onSave={(v) => {
          metas.saveTarget("water", v.goalMl!);
          metas.savePortion(v.portionMl!);
        }}
      />

      <MetaSheet
        open={sheet === "meals"}
        onOpenChange={(open) => setSheet(open ? "meals" : null)}
        title="Alimentação"
        tone="green"
        icon={<ForkKnifeIcon size={22} weight="fill" />}
        fields={[
          {
            key: "target",
            label: "Refeições por dia",
            value: metas.mealsTarget,
            min: 1,
            max: 8,
            step: 1,
          },
        ]}
        onSave={(v) => metas.saveTarget("meals", v.target!)}
      />

      <MetaSheet
        open={sheet === "workout"}
        onOpenChange={(open) => setSheet(open ? "workout" : null)}
        title="Treino"
        tone="pink"
        icon={<BarbellIcon size={22} weight="fill" />}
        fields={[
          {
            key: "target",
            label: "Dias por semana",
            value: metas.workoutTarget,
            min: 1,
            max: 7,
            step: 1,
          },
        ]}
        onSave={(v) => metas.saveTarget("workout", v.target!)}
      />
    </div>
  );
}
