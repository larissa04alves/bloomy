import { BarbellIcon, DropIcon, ForkKnifeIcon, PillIcon } from "@phosphor-icons/react";

import type { TodayPayload } from "@/lib/api-types";

import { workoutLabel } from "../hooks/format";
import { RitualCard } from "./RitualCard";

/** Fração segura para a barra: alvo 0 nunca vira NaN/Infinity. */
function ratio(done: number, target: number): number {
  return target > 0 ? done / target : 0;
}

export function RituaisGrid({ today }: { today: TodayPayload }) {
  const treino = workoutLabel(today.workout);
  const semRemedio = today.meds.total === 0;

  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="font-display text-base font-bold text-ink">Seus rituais de hoje</h2>
      <div className="grid grid-cols-2 gap-3">
        <RitualCard
          tone="lilac"
          icon={<DropIcon size={22} weight="fill" />}
          title="Hidratação"
          subtitle={`${today.water.done} de ${today.water.target} garrafas`}
          progress={ratio(today.water.done, today.water.target)}
          href="/corpo"
        />
        <RitualCard
          tone="green"
          icon={<ForkKnifeIcon size={22} weight="fill" />}
          title="Alimentação"
          subtitle={`${today.meals.done} de ${today.meals.target} refeições`}
          progress={ratio(today.meals.done, today.meals.target)}
          href="/corpo"
        />
        <RitualCard
          tone="pink"
          icon={<BarbellIcon size={22} weight="fill" />}
          title="Treino"
          subtitle={treino.subtitle}
          action={treino.action ?? undefined}
          href="/treino"
        />
        <RitualCard
          tone="coral"
          icon={<PillIcon size={22} weight="fill" />}
          title="Remédios"
          subtitle={
            semRemedio ? "Nenhum cadastrado" : `${today.meds.taken} de ${today.meds.total} tomados`
          }
          action={
            semRemedio
              ? { label: "Cadastrar", kind: "plus" }
              : { label: "Marcar", kind: "check" }
          }
          // sem remédio a ação é cadastrar, e cadastro vive na Saúde
          href={semRemedio ? "/saude" : "/corpo"}
        />
      </div>
    </section>
  );
}
