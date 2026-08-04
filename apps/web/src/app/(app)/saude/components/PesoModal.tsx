"use client";

import { CircleNotchIcon, ScalesIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { Stepper } from "@/components/stepper";
import type { WeightLog } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

import {
  formatKg,
  fromDayString,
  parseKgToGrams,
  toDayString,
} from "../hooks/peso-helpers";
import { DatePickerField } from "./DatePickerField";

const MIN_GRAMS = 20_000;
const MAX_GRAMS = 300_000;
const STEP_GRAMS = 100; // 0,1 kg

export function PesoModal({
  open,
  onOpenChange,
  initial,
  lastGrams,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: WeightLog;
  lastGrams?: number;
  /** Gravação em curso: trava o botão e o mantém em "Salvando…". */
  saving: boolean;
  /** `false` = falhou: o sheet fica aberto com os valores, pra poder tentar de novo. */
  onSubmit: (input: { grams: number; day: string }) => Promise<boolean>;
}) {
  // Sem histórico e sem edição, não há de onde partir: o campo nasce vazio
  // pedindo o número em vez de chutar um peso qualquer.
  const [grams, setGrams] = useState<number | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  // Depois do toque no convite, mas antes de um número válido: mostra o input cru.
  const [enteringWeight, setEnteringWeight] = useState(false);
  const [weightDraft, setWeightDraft] = useState("");

  // Reabrir o sheet reinicia o rascunho a partir do que estamos editando (ou de hoje).
  // Dependência é `initial?.id` (não o objeto `initial`): a Task 9 pode recalcular
  // `initial` a cada render do pai (ex.: `weights.find(...)` inline), e reagir à
  // identidade do objeto reabriria o reset com o sheet já aberto, apagando o rascunho
  // em andamento. `initial` continua sendo lido aqui dentro, só não é dependência.
  useEffect(() => {
    if (!open) return;
    setGrams(initial?.grams ?? lastGrams ?? null);
    // O default é o "hoje" de Brasília (`dayFor()`, ADR-0002), não `new Date()`:
    // o `day` persistido não pode nascer do fuso do aparelho — um celular com
    // fuso divergente (viagem, config errada) desalinharia o registro do "hoje"
    // do resto do app e, perto da meia-noite, o servidor poderia recusar um
    // registro legítimo como "data no futuro". `fromDayString` ancora ao
    // meio-dia local, então o ida-e-volta com `toDayString` devolve o mesmo dia
    // em qualquer fuso de dispositivo.
    setDate(initial ? fromDayString(initial.day) : fromDayString(dayFor()));
    setEnteringWeight(false);
    setWeightDraft("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependência deliberada em `initial?.id`, ver comentário acima
  }, [open, initial?.id, lastGrams]);

  const canSubmit = grams !== null && date !== undefined;

  const commitWeightDraft = () => {
    const parsed = parseKgToGrams(weightDraft);
    if (parsed === null || parsed < MIN_GRAMS || parsed > MAX_GRAMS) return;
    setGrams(parsed);
    setEnteringWeight(false);
    setWeightDraft("");
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Editar peso" : "Registrar peso"}
      tone="lilac"
      icon={<ScalesIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!canSubmit || saving}
          onClick={async () => {
            if (grams === null || !date) return;

            const ok = await onSubmit({ grams, day: toDayString(date) });
            if (ok) onOpenChange(false);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn transition-opacity disabled:opacity-60"
        >
          {saving ? (
            <>
              <CircleNotchIcon
                size={18}
                weight="bold"
                className="animate-spin"
              />
              Salvando…
            </>
          ) : initial ? (
            "Salvar"
          ) : (
            "Registrar"
          )}
        </button>
      }
    >
      {grams === null ? (
        enteringWeight ? (
          <div className="flex flex-col items-center gap-1 rounded-card border border-dashed border-hairline p-6">
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus -- o input só existe após o toque no convite
              autoFocus
              inputMode="decimal"
              value={weightDraft}
              onChange={(e) => setWeightDraft(e.target.value)}
              onBlur={commitWeightDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitWeightDraft();
                }
              }}
              placeholder="00,0"
              aria-label="Peso em quilos"
              className="w-32 border-b-2 border-dashed border-control-off bg-transparent text-center font-display text-4xl font-bold text-ink outline-none"
            />
            <span className="text-sm font-semibold text-ink-read">kg</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEnteringWeight(true)}
            className="rounded-card border border-dashed border-hairline p-6 text-center font-display text-lg font-bold text-lilac-deep"
          >
            Toque para informar seu peso
          </button>
        )
      ) : (
        <Stepper
          value={grams}
          min={MIN_GRAMS}
          max={MAX_GRAMS}
          step={STEP_GRAMS}
          onChange={setGrams}
          unit="kg"
          format={formatKg}
          parse={parseKgToGrams}
        />
      )}

      {grams !== null ? (
        <p className="text-center text-xs font-semibold text-ink-faint">
          ±0,1 nos botões · toque no número pra digitar
        </p>
      ) : enteringWeight ? (
        <p className="text-center text-xs font-semibold text-ink-faint">
          Aperte Enter ou toque fora pra confirmar
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-ink-soft">Data</span>
        <DatePickerField
          value={date}
          onChange={setDate}
          placeholder="Escolha a data"
        />
      </div>
    </BottomSheet>
  );
}
