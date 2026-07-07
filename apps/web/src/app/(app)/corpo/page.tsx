"use client";

import { useState } from "react";

import { Screen } from "@/components/screen";
import { GARRAFA_ML, type MealType } from "@/lib/api-types";

import { HidratacaoSection } from "./components/HidratacaoSection";
import { MealModal } from "./components/MealModal";
import { MedicationModal } from "./components/MedicationModal";
import { RefeicoesSection } from "./components/RefeicoesSection";
import { RemediosSection } from "./components/RemediosSection";
import { ResumoCard } from "./components/ResumoCard";
import { WaterModal } from "./components/WaterModal";
import { useGoals } from "./hooks/useGoals";
import { useHidratacao } from "./hooks/useHidratacao";
import { useRefeicoes } from "./hooks/useRefeicoes";
import { useRemedios } from "./hooks/useRemedios";

export default function CorpoPage() {
  const { waterGoalMl, mealsTarget } = useGoals();
  const hidr = useHidratacao(waterGoalMl);
  const ref = useRefeicoes();
  const rem = useRemedios();

  const [waterOpen, setWaterOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);
  const [mealType, setMealType] = useState<MealType | undefined>();
  const [medOpen, setMedOpen] = useState(false);

  return (
    <Screen title="Corpo" subtitle="Seu físico de hoje">
      <ResumoCard
        agua={{ done: hidr.done, target: hidr.target }}
        refeicoes={{ done: ref.count, target: mealsTarget }}
        remedios={{ done: rem.taken, target: rem.total }}
      />

      <HidratacaoSection
        done={hidr.done}
        target={hidr.target}
        onAddGarrafa={() => hidr.addWater(GARRAFA_ML)}
        onOpenModal={() => setWaterOpen(true)}
      />

      <RefeicoesSection
        meals={ref.meals}
        pendingTypes={ref.pendingTypes}
        onOpenModal={(t) => {
          setMealType(t);
          setMealOpen(true);
        }}
      />

      <RemediosSection intakes={rem.intakes} onToggle={rem.toggle} onOpenModal={() => setMedOpen(true)} />

      <WaterModal open={waterOpen} onOpenChange={setWaterOpen} onConfirm={hidr.addWater} />
      <MealModal open={mealOpen} onOpenChange={setMealOpen} initialType={mealType} onSubmit={ref.addMeal} />
      <MedicationModal open={medOpen} onOpenChange={setMedOpen} onSubmit={rem.addMedication} />
    </Screen>
  );
}
