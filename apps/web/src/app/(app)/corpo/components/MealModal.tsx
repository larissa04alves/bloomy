"use client";

import { ForkKnifeIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { MEAL_LABELS, type MealType } from "@/lib/api-types";

const ALL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function MealModal({
  open,
  onOpenChange,
  initialType,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: MealType;
  onSubmit: (input: { type: MealType; description: string }) => void;
}) {
  const [type, setType] = useState<MealType>(initialType ?? "breakfast");
  const [items, setItems] = useState<string[]>([""]);

  // Ao (re)abrir: reseta e reflete o tipo pré-selecionado do card pendente.
  useEffect(() => {
    if (open) {
      setType(initialType ?? "breakfast");
      setItems([""]);
    }
  }, [open, initialType]);

  // Itens viram uma descrição única ("arroz, feijão") — a API guarda um texto só.
  const description = items
    .map((i) => i.trim())
    .filter(Boolean)
    .join(", ");
  const canSave = description.length > 0;

  const updateItem = (index: number, value: string) =>
    setItems((prev) => prev.map((x, i) => (i === index ? value : x)));
  const addItem = () => setItems((prev) => [...prev, ""]);
  const removeItem = (index: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const submit = () => {
    if (!canSave) return;
    onSubmit({ type, description });
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar refeição"
      tone="green"
      icon={<ForkKnifeIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!canSave}
          onClick={submit}
          className="w-full rounded-full bg-green-mid py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          Salvar
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((t) => (
          <ChoiceChip key={t} tone="green" selected={type === t} onClick={() => setType(t)}>
            {MEAL_LABELS[t]}
          </ChoiceChip>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          // eslint-disable-next-line react/no-array-index-key -- lista curta e efêmera
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder={i === 0 ? "O que você comeu?" : "Mais um item…"}
              className="flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
            {items.length > 1 ? (
              <button
                type="button"
                aria-label="Remover item"
                onClick={() => removeItem(i)}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-green-tint text-green-deep"
              >
                <XIcon size={16} weight="bold" />
              </button>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-2.5 text-[13px] font-bold text-green-deep"
        >
          <PlusIcon size={16} weight="bold" /> Adicionar mais
        </button>
      </div>
    </BottomSheet>
  );
}
