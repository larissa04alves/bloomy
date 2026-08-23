import {
  BarbellIcon,
  DropIcon,
  ForkKnifeIcon,
  PillIcon,
} from "@phosphor-icons/react";

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

  const aguaCompleta =
    today.water.totalMl >= today.water.goalMl && today.water.goalMl > 0;
  const refeicoesCompletas =
    today.meals.done >= today.meals.target && today.meals.target > 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3.5">
      <h2 className="font-display text-base font-bold text-ink">
        Seus rituais de hoje
      </h2>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3">
        <RitualCard
          tone="lilac"
          icon={<DropIcon size={26} weight="fill" />}
          title="Hidratação"
          subtitle={`${today.water.totalMl} de ${today.water.goalMl} ml`}
          progress={ratio(today.water.totalMl, today.water.goalMl)}
          action={
            aguaCompleta
              ? { label: "Meta batida", kind: "check" }
              : { label: "Registrar", kind: "plus" }
          }
          href="/corpo"
        />
        <RitualCard
          tone="green"
          icon={<ForkKnifeIcon size={26} weight="fill" />}
          title="Alimentação"
          subtitle={`${today.meals.done} de ${today.meals.target} refeições`}
          progress={ratio(today.meals.done, today.meals.target)}
          action={
            refeicoesCompletas
              ? { label: "Tudo registrado", kind: "check" }
              : { label: "Adicionar", kind: "plus" }
          }
          href="/corpo"
        />
        <RitualCard
          tone="pink"
          icon={<BarbellIcon size={26} weight="fill" />}
          title="Treino"
          subtitle={treino.subtitle}
          action={treino.action ?? undefined}
          href="/treino"
        />
        <RitualCard
          tone="coral"
          icon={<PillIcon size={26} weight="fill" />}
          title="Remédios"
          subtitle={
            semRemedio
              ? "Nenhum cadastrado"
              : `${today.meds.taken} de ${today.meds.total} tomados`
          }
          progress={
            semRemedio ? undefined : ratio(today.meds.taken, today.meds.total)
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
