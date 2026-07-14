"use client";

import {
  BowlFoodIcon,
  CheckCircleIcon,
  CoffeeIcon,
  CookieIcon,
  type Icon,
  MoonStarsIcon,
  PlusIcon,
} from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import { SwipeableRow } from "@/components/swipeable-row";
import { MEAL_LABELS, type Meal, type MealType } from "@/lib/api-types";

/** Um ícone por refeição (visual do mock). */
const MEAL_ICONS: Record<MealType, Icon> = {
  breakfast: CoffeeIcon,
  lunch: BowlFoodIcon,
  dinner: MoonStarsIcon,
  snack: CookieIcon,
};

export function RefeicoesSection({
  meals,
  pendingTypes,
  onOpenModal,
  onEdit,
  onDelete,
}: {
  meals: Meal[];
  pendingTypes: MealType[];
  onOpenModal: (type?: MealType) => void;
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Alimentação</h2>
        <button
          type="button"
          onClick={() => onOpenModal()}
          className="flex items-center gap-1 text-sm font-bold text-green-deep"
        >
          <PlusIcon size={16} weight="bold" /> Adicionar
        </button>
      </div>

      {meals.map((m) => {
        const MealIcon = MEAL_ICONS[m.type];
        return (
          <SwipeableRow key={m.id} onEdit={() => onEdit(m)} onDelete={() => onDelete(m.id)}>
            <div className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card-sm">
              <IconChip tone="green" icon={<MealIcon size={22} weight="fill" />} />
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold text-ink">{MEAL_LABELS[m.type]}</span>
                <span className="text-xs font-semibold text-ink-read">{m.description}</span>
              </div>
              <CheckCircleIcon size={24} weight="fill" className="text-green-deep" />
            </div>
          </SwipeableRow>
        );
      })}

      {pendingTypes.map((t) => {
        const MealIcon = MEAL_ICONS[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onOpenModal(t)}
            className="flex items-center gap-3 rounded-card border border-dashed border-hairline p-3 text-left"
          >
            <IconChip tone="green" variant="white" icon={<MealIcon size={22} weight="fill" />} />
            <span className="flex-1 text-sm font-semibold text-ink-read">
              {MEAL_LABELS[t]} — registrar
            </span>
            <PlusIcon size={20} weight="bold" className="text-ink-faint" />
          </button>
        );
      })}
    </section>
  );
}
