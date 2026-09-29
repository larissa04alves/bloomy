"use client";

import { ForkKnifeIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { MEAL_LABELS, type MealItem, type MealType } from "@/lib/api-types";

import { MEAL_GRAMS_MAX, MEAL_ITEMS_MAX, toMealItems } from "../hooks/format";

const ALL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/** `id` estável: com key por índice, remover uma linha levaria o foco para o item errado. */
type Row = { id: string; name: string; grams: string };
const newRow = (name = "", grams = ""): Row => ({ id: crypto.randomUUID(), name, grams });

export function MealModal({
  open,
  onOpenChange,
  initialType,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: MealType;
  editing?: { type: MealType; items: MealItem[] };
  onSubmit: (input: { type: MealType; items: MealItem[] }) => void;
}) {
  const [type, setType] = useState<MealType>(initialType ?? "breakfast");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);

  // Ao (re)abrir: pré-preenche do modo edição, ou reseta com o tipo pendente.
  useEffect(() => {
    if (open) {
      setType(editing?.type ?? initialType ?? "breakfast");
      const seeded = editing?.items.map((i) => newRow(i.name, i.grams === null ? "" : String(i.grams)));
      setRows(seeded && seeded.length > 0 ? seeded : [newRow()]);
    }
  }, [open, initialType, editing?.type, editing?.items]);

  const items = toMealItems(rows);
  // Acima do teto o Salvar trava em vez de cortar o número calado.
  const canSave =
    items.length > 0 &&
    items.length <= MEAL_ITEMS_MAX &&
    items.every((i) => i.grams === null || i.grams <= MEAL_GRAMS_MAX);

  const atLimit = rows.length >= MEAL_ITEMS_MAX;
  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addRow = () =>
    setRows((prev) => (prev.length >= MEAL_ITEMS_MAX ? prev : [...prev, newRow()]));
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.id !== id) : prev));

  const submit = () => {
    if (!canSave) return;
    onSubmit({ type, items });
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar refeição" : "Adicionar refeição"}
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
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-2">
            <input
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRow();
                }
              }}
              placeholder={i === 0 ? "O que você comeu?" : "Mais um item…"}
              className="min-w-0 flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
            <label className="flex w-19.5 shrink-0 items-center gap-1 rounded-control border border-hairline bg-white px-3 py-3 focus-within:border-lilac">
              <input
                value={row.grams}
                onChange={(e) =>
                  updateRow(row.id, { grams: e.target.value.replace(/\D/g, "").slice(0, 4) })
                }
                inputMode="numeric"
                maxLength={4}
                placeholder="—"
                aria-label="Gramas"
                className="w-full min-w-0 bg-transparent text-right text-sm font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <span className="text-sm font-semibold text-ink-read">g</span>
            </label>
            {rows.length > 1 ? (
              <button
                type="button"
                aria-label="Remover item"
                onClick={() => removeRow(row.id)}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-green-tint text-green-deep"
              >
                <XIcon size={16} weight="bold" />
              </button>
            ) : null}
          </div>
        ))}

        {atLimit ? null : (
          <button
            type="button"
            onClick={addRow}
            className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-2.5 text-sm font-bold text-green-deep"
          >
            <PlusIcon size={16} weight="bold" /> Adicionar mais
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
