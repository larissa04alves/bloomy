"use client";

import { BarbellIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import {
  type Focus,
  FOCUS_LABELS,
  FOCUS_VALUES,
  type WorkoutWithExercises,
} from "@/lib/api-types";

import type { WorkoutInput } from "../hooks/useTreinos";

type ExRow = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
};

const NEW_ROW: ExRow = {
  name: "",
  targetSets: 3,
  targetReps: 12,
  restSeconds: 45,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));
}

/** Campo numérico compacto sem as setinhas (spinners) do input padrão. */
function NumField({
  value,
  label,
  min,
  max,
  ariaLabel,
  onChange,
}: {
  value: number;
  label: string;
  min: number;
  max: number;
  ariaLabel: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 items-center justify-center gap-1 rounded-control border border-hairline bg-white px-2 py-2">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        aria-label={ariaLabel}
        className="w-9 bg-transparent text-center text-[14px] font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-[11px] font-bold text-ink-read">{label}</span>
    </label>
  );
}

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
  const [rows, setRows] = useState<ExRow[]>([NEW_ROW]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setFocus(editing?.focus ?? "chest");
      setRows(
        editing && editing.exercises.length > 0
          ? editing.exercises.map((e) => ({
              name: e.name,
              targetSets: clamp(e.targetSets, 1, 20),
              targetReps: clamp(e.targetReps, 1, 50),
              restSeconds: clamp(e.restSeconds, 0, 600),
            }))
          : [NEW_ROW],
      );
    }
  }, [open, editing]);

  const cleanRows = rows.filter((r) => r.name.trim().length > 0);
  const canSave = name.trim().length > 0 && cleanRows.length > 0;

  const setRow = (i: number, patch: Partial<ExRow>) =>
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  const addRow = () => setRows((prev) => [...prev, NEW_ROW]);
  const removeRow = (i: number) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev,
    );

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      focus,
      exercises: cleanRows.map((r, i) => ({
        name: r.name.trim(),
        targetSets: r.targetSets,
        targetReps: r.targetReps,
        restSeconds: r.restSeconds,
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
        {FOCUS_VALUES.map((f) => (
          <ChoiceChip
            key={f}
            tone="pink"
            selected={focus === f}
            onClick={() => setFocus(f)}
          >
            {FOCUS_LABELS[f]}
          </ChoiceChip>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          // eslint-disable-next-line react/no-array-index-key -- lista curta e efêmera
          <div
            key={i}
            className="flex flex-col gap-2 rounded-control border border-hairline bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={r.name}
                onChange={(e) => setRow(i, { name: e.target.value })}
                placeholder={
                  i === 0 ? "Nome do exercício" : "Mais um exercício…"
                }
                className="flex-1 bg-transparent text-[14px] font-semibold text-ink placeholder:text-ink-faint outline-none"
                aria-label={`Nome do exercício ${i + 1}`}
              />
              {rows.length > 1 ? (
                <button
                  type="button"
                  aria-label="Remover exercício"
                  onClick={() => removeRow(i)}
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-pink-tint text-pink-deep"
                >
                  <XIcon size={14} weight="bold" />
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <NumField
                value={r.targetSets}
                label="Séries"
                min={1}
                max={20}
                ariaLabel={`Séries do exercício ${i + 1}`}
                onChange={(v) => setRow(i, { targetSets: v })}
              />
              <NumField
                value={r.targetReps}
                label="Reps"
                min={1}
                max={50}
                ariaLabel={`Reps do exercício ${i + 1}`}
                onChange={(v) => setRow(i, { targetReps: v })}
              />
              <NumField
                value={r.restSeconds}
                label="Intervalo"
                min={0}
                max={600}
                ariaLabel={`Descanso em segundos do exercício ${i + 1}`}
                onChange={(v) => setRow(i, { restSeconds: v })}
              />
            </div>
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
