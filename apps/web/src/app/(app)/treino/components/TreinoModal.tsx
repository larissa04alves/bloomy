"use client";

import { BarbellIcon, PersonSimpleTaiChiIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { IconChip } from "@/components/icon-chip";
import {
  type CatalogExercise,
  type Focus,
  FOCUS_LABELS,
  FOCUS_VALUES,
  type WorkoutWithExercises,
} from "@/lib/api-types";

import type { WorkoutInput } from "../hooks/useTreinos";
import { commitDraft, numberDraft } from "../hooks/format";
import { NEW_EXERCISE_DEFAULTS } from "../hooks/session";
import { useCatalogo } from "../hooks/useCatalogo";
import { BuscaExercicio } from "./BuscaExercicio";
import { GifThumb } from "./GifThumb";
import { GifViewer } from "./GifViewer";

type ExRow = {
  name: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  catalogId: string | null;
  muscleGroups: Focus[];
  /** UI-only: grupo do exercício de catálogo (p/ o chip); não enviado ao back. */
  group?: Focus;
};

const NEW_ROW: ExRow = {
  name: "",
  ...NEW_EXERCISE_DEFAULTS,
  catalogId: null,
  muscleGroups: [],
};

/** Liga/desliga um foco mantendo a ordem de FOCUS_VALUES. */
function toggleFocus(list: Focus[], f: Focus): Focus[] {
  return FOCUS_VALUES.filter((x) => (x === f ? !list.includes(f) : list.includes(x)));
}

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
  // Rascunho em texto: apagar não vira o mínimo na hora e "030" vira "30".
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="flex flex-1 items-center justify-center gap-1 rounded-control border border-hairline bg-white px-2 py-2">
      <input
        type="text"
        inputMode="numeric"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(numberDraft(e.target.value))}
        onBlur={() => {
          if (draft !== null) onChange(commitDraft(draft, min, max));
          setDraft(null);
        }}
        aria-label={ariaLabel}
        className="w-9 bg-transparent text-center text-sm font-bold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-xs font-bold text-ink-read">{label}</span>
    </label>
  );
}

/** Seletor de grupos musculares (custom): botão 💪 colapsado que expande os 8 grupos. */
function MuscleGroupPicker({
  value,
  onChange,
}: {
  value: Focus[];
  onChange: (g: Focus[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Escolher grupos musculares"
        className={`flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-xs font-bold ${
          value.length > 0
            ? "border-pink-bright bg-pink-tint text-pink-deep"
            : "border-hairline bg-lilac-tint-soft text-ink-read"
        }`}
      >
        <PersonSimpleTaiChiIcon size={16} weight="fill" />
        {value.length > 0 ? value.map((f) => FOCUS_LABELS[f]).join(", ") : "Grupo muscular"}
      </button>
      {open ? (
        <div className="flex flex-wrap gap-1.5">
          {FOCUS_VALUES.map((f) => (
            <ChoiceChip
              key={f}
              tone="pink"
              selected={value.includes(f)}
              onClick={() => onChange(toggleFocus(value, f))}
            >
              {FOCUS_LABELS[f]}
            </ChoiceChip>
          ))}
        </div>
      ) : null}
    </div>
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
  const [focuses, setFocuses] = useState<Focus[]>([]);
  const [rows, setRows] = useState<ExRow[]>([]);
  const [view, setView] = useState<"form" | "busca">("form");
  const [preview, setPreview] = useState<CatalogExercise | null>(null);

  const { catalog } = useCatalogo(open); // só busca o catálogo com o modal aberto
  const catalogById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setFocuses(editing?.focuses ?? []);
      setView("form");
      setPreview(null);
      setRows(
        editing && editing.exercises.length > 0
          ? // edição: carrega os exercícios salvos
            editing.exercises.map((e) => ({
              name: e.name,
              targetSets: clamp(e.targetSets, 1, 20),
              targetReps: clamp(e.targetReps, 1, 50),
              restSeconds: clamp(e.restSeconds, 0, 600),
              catalogId: e.catalogId,
              muscleGroups: e.muscleGroups,
            }))
          : // novo treino: começa vazio — adiciona pela busca do catálogo
            [],
      );
    }
  }, [open, editing]);

  const cleanRows = rows.filter((r) => r.name.trim().length > 0);
  const canSave = name.trim().length > 0 && focuses.length > 0 && cleanRows.length > 0;

  const setRow = (i: number, patch: Partial<ExRow>) =>
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  const removeRow = (i: number) =>
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev,
    );

  const handlePick = (ex: CatalogExercise) => {
    setRows((prev) => [
      ...prev,
      {
        name: ex.namePt,
        catalogId: ex.id,
        group: ex.group,
        muscleGroups: [],
        ...NEW_EXERCISE_DEFAULTS,
      },
    ]);
    setView("form");
  };

  const handleCustom = () => {
    setRows((prev) => [...prev, NEW_ROW]);
    setView("form");
  };

  const submit = () => {
    if (!canSave) return;
    onSubmit({
      name: name.trim(),
      focuses,
      exercises: cleanRows.map((r, i) => ({
        name: r.name.trim(),
        targetSets: r.targetSets,
        targetReps: r.targetReps,
        restSeconds: r.restSeconds,
        position: i,
        catalogId: r.catalogId,
        muscleGroups: r.catalogId ? [] : r.muscleGroups,
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
        view === "form" ? (
          <button
            type="button"
            disabled={!canSave}
            onClick={submit}
            className="w-full rounded-full bg-pink-bright py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
          >
            {editing ? "Salvar" : "Criar treino"}
          </button>
        ) : null
      }
    >
      {view === "busca" ? (
        <BuscaExercicio
          onBack={() => setView("form")}
          onPick={handlePick}
          onCustom={handleCustom}
        />
      ) : (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do treino (ex.: Peito e tríceps)"
            className="w-full rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-pink-bright focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {FOCUS_VALUES.map((f) => (
              <ChoiceChip
                key={f}
                tone="pink"
                selected={focuses.includes(f)}
                // o último foco marcado não desmarca: treino sempre tem ao menos um
                onClick={() =>
                  setFocuses((prev) =>
                    prev.length === 1 && prev[0] === f ? prev : toggleFocus(prev, f),
                  )
                }
              >
                {FOCUS_LABELS[f]}
              </ChoiceChip>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const group = r.catalogId
                ? catalogById.get(r.catalogId)?.group ?? r.group
                : undefined;

              return (
                // eslint-disable-next-line react/no-array-index-key -- lista curta e efêmera
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-control border border-hairline bg-white p-3"
                >
                  {r.catalogId ? (
                    <div className="flex items-center gap-2">
                      <GifThumb
                        id={r.catalogId}
                        alt=""
                        className="size-12 shrink-0 rounded-control"
                      />
                      <div className="flex flex-1 flex-col items-start gap-1">
                        <span className="text-sm font-bold text-ink">{r.name}</span>
                        {group ? (
                          <span className="rounded-full bg-pink-tint px-2 py-0.5 text-xs font-bold text-pink-deep">
                            {FOCUS_LABELS[group]}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreview(catalogById.get(r.catalogId!) ?? null)}
                        className="shrink-0 text-xs font-bold text-pink-deep"
                      >
                        ⤢ ver execução
                      </button>
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
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <IconChip
                          tone="pink"
                          icon={<BarbellIcon size={22} weight="fill" />}
                          className="size-12 rounded-control"
                        />
                        <input
                          value={r.name}
                          onChange={(e) => setRow(i, { name: e.target.value })}
                          placeholder={
                            i === 0 ? "Nome do exercício" : "Mais um exercício…"
                          }
                          className="flex-1 bg-transparent text-sm font-semibold text-ink placeholder:text-ink-faint outline-none"
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
                      <MuscleGroupPicker
                        value={r.muscleGroups}
                        onChange={(g) => setRow(i, { muscleGroups: g })}
                      />
                    </>
                  )}
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
              );
            })}
            <button
              type="button"
              onClick={() => setView("busca")}
              className="flex items-center justify-center gap-1 rounded-control border border-dashed border-hairline py-2.5 text-sm font-bold text-pink-deep"
            >
              <PlusIcon size={16} weight="bold" /> Adicionar exercício
            </button>
          </div>
        </>
      )}

      {preview ? <GifViewer exercise={preview} onClose={() => setPreview(null)} /> : null}
    </BottomSheet>
  );
}
