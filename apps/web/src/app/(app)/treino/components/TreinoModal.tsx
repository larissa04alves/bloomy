"use client";

import { BarbellIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { type Focus, FOCUS_LABELS, type WorkoutWithExercises } from "@/lib/api-types";

import type { WorkoutInput } from "../hooks/useTreinos";

const FOCI: Focus[] = ["chest", "back", "legs", "cardio"];

type ExRow = { name: string; targetSets: number };

export function TreinoModal({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: WorkoutWithExercises;
  onSubmit: (input: WorkoutInput) => void;
}) {
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<Focus>("chest");
  const [rows, setRows] = useState<ExRow[]>([{ name: "", targetSets: 3 }]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setFocus(editing?.focus ?? "chest");
      setRows(
        editing && editing.exercises.length > 0
          ? editing.exercises.map((e) => ({ name: e.name, targetSets: e.targetSets }))
          : [{ name: "", targetSets: 3 }],
      );
    }
  }, [open, editing]);

  const cleanRows = rows.filter((r) => r.name.trim().length > 0);
  const canSave = name.trim().length > 0 && cleanRows.length > 0;

  const setRow = (i: number, patch: Partial<ExRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { name: "", targetSets: 3 }]);
  const removeRow = (i: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      focus,
      exercises: cleanRows.map((r, i) => ({
        name: r.name.trim(),
        targetSets: r.targetSets,
        position: i,
      })),
    });
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Editar treino" : "Novo treino"}
      tone="pink"
      icon={<BarbellIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!canSave}
          onClick={submit}
          className="w-full rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          {editing ? "Salvar" : "Criar treino"}
        </button>
      }
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do treino (ex.: Peito e tríceps)"
        className="w-full rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-pink-bright focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {FOCI.map((f) => (
          <ChoiceChip key={f} tone="pink" selected={focus === f} onClick={() => setFocus(f)}>
            {FOCUS_LABELS[f]}
          </ChoiceChip>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          // eslint-disable-next-line react/no-array-index-key -- lista curta e efêmera
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.name}
              onChange={(e) => setRow(i, { name: e.target.value })}
              placeholder={i === 0 ? "Exercício" : "Mais um exercício…"}
              className="flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-pink-bright focus:outline-none"
            />
            <label className="flex items-center gap-1 rounded-control border border-hairline bg-white px-2 py-2.5">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={r.targetSets}
                onChange={(e) => setRow(i, { targetSets: Math.min(20, Math.max(1, Number(e.target.value))) })}
                className="w-8 bg-transparent text-center text-[14px] font-bold text-ink outline-none"
                aria-label={`Séries do exercício ${i + 1}`}
              />
              <span className="text-[11px] font-bold text-ink-read">séries</span>
            </label>
            {rows.length > 1 ? (
              <button
                type="button"
                aria-label="Remover exercício"
                onClick={() => removeRow(i)}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-pink-tint text-pink-deep"
              >
                <XIcon size={16} weight="bold" />
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-2.5 text-[13px] font-bold text-pink-deep"
        >
          <PlusIcon size={16} weight="bold" /> Adicionar exercício
        </button>
      </div>
    </BottomSheet>
  );
}
