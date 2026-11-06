"use client";

import { PillIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { DatePickerField } from "@/components/date-picker-field";
import { Stepper } from "@/components/stepper";
import { TimeSelect } from "@/components/time-select";
import type { MethodUpdateInput } from "@/lib/api-types";
import {
  CYCLE_METHODS,
  METHOD_LABELS,
  methodMode,
  PILL_ACTIVE_DAYS_LIMITS,
} from "@/lib/cycle";
import {
  canFixPosition,
  EMPTY_METHOD_FORM,
  hasUnits,
  keepsPosition,
  type MethodForm,
  methodFormValid,
  PAUSE_DAYS_LIMITS,
  PAUSE_EVERY_LIMITS,
  toMethodInput,
  USUAL_LENGTH_LIMITS,
} from "@/lib/cycle-method-form";
import { dayFor } from "@/server/shared/day";

const UNIT_NOUN = {
  pill: {
    one: "cartela",
    many: "cartelas",
    fix: "Corrigir cartela atual",
    current: "Início da cartela atual",
    which: "Qual cartela da sequência é essa?",
    ordinal: "ª",
  },
  ring: {
    one: "anel",
    many: "anéis",
    fix: "Corrigir anel atual",
    current: "Início do anel atual",
    which: "Qual anel da sequência é esse?",
    ordinal: "º",
  },
  patch: {
    one: "adesivo",
    many: "adesivos",
    fix: "Corrigir adesivo atual",
    current: "Início do adesivo atual",
    which: "Qual adesivo da sequência é esse?",
    ordinal: "º",
  },
} as const;

// O campo guarda "YYYY-MM-DD" (dia local); o calendário trabalha com Date à meia-noite local.
const toDate = (day: string) => {
  if (!day) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const pad2 = (n: number) => String(n).padStart(2, "0");
const toDay = (date: Date | undefined) =>
  date
    ? `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    : "";

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-bold text-ink">{children}</span>;
}

function FixButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center self-start text-sm font-bold text-peach-deep"
    >
      {children}
    </button>
  );
}

export function CycleMethodSheet({
  open,
  onOpenChange,
  initial,
  saving = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: MethodForm;
  saving?: boolean;
  /** Com `initial`, mesmo tipo e mesma pausa, vem sem a posição (só configuração). */
  onSubmit: (input: MethodUpdateInput) => void;
}) {
  const [form, setForm] = useState<MethodForm>(initial ?? EMPTY_METHOD_FORM);
  const today = dayFor();

  // Só ao abrir: um `initial` novo vindo do pai durante a edição não pode apagar o rascunho.
  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_METHOD_FORM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<MethodForm>) =>
    setForm((f) => ({ ...f, ...patch }));
  const [hour = "", minute = ""] = form.pillTime
    ? form.pillTime.split(":")
    : [];
  const noun =
    form.kind === "pill" || form.kind === "ring" || form.kind === "patch"
      ? UNIT_NOUN[form.kind]
      : null;
  const natural = methodMode(form.kind, form.pauses) === "natural";
  const askPosition = !keepsPosition(form, initial);
  const canFix = canFixPosition(form, initial);
  const units = noun !== null && hasUnits(form);
  const valid = methodFormValid(form, today, initial);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title="Seu método"
      tone="peach"
      icon={<PillIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          disabled={!valid || saving}
          onClick={() => onSubmit(toMethodInput(form, initial))}
          className="w-full rounded-full bg-peach py-3.5 font-display font-bold text-white shadow-btn-peach disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar método"}
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {CYCLE_METHODS.map((kind) => (
          <ChoiceChip
            key={kind}
            tone="peach"
            selected={form.kind === kind}
            onClick={() => set({ kind })}
          >
            {METHOD_LABELS[kind]}
          </ChoiceChip>
        ))}
      </div>

      {natural ? (
        <>
          {askPosition ? (
            <div className="flex flex-col gap-2">
              <Label>Início da última menstruação</Label>
              <DatePickerField
                typeable
                tone="peach"
                label="Início da última menstruação"
                value={toDate(form.lastPeriodStart)}
                maxDate={toDate(today)}
                onChange={(date) => set({ lastPeriodStart: toDay(date) })}
              />
            </div>
          ) : canFix ? (
            <FixButton onClick={() => set({ fixPosition: true })}>
              Corrigir última menstruação
            </FixButton>
          ) : null}
          <Label>Duração habitual do ciclo</Label>
          <div className="-mt-2">
            <Stepper
              value={form.usualLength}
              min={USUAL_LENGTH_LIMITS.min}
              max={USUAL_LENGTH_LIMITS.max}
              unit="dias"
              onChange={(usualLength) => set({ usualLength })}
            />
          </div>
        </>
      ) : null}

      {form.kind === "pill" ? (
        <>
          <Label>Comprimidos ativos por cartela</Label>
          <div className="-mt-2">
            <Stepper
              value={form.activeDays}
              min={PILL_ACTIVE_DAYS_LIMITS.min}
              max={PILL_ACTIVE_DAYS_LIMITS.max}
              unit="comprimidos"
              onChange={(activeDays) => set({ activeDays })}
            />
          </div>
          <Label>Faz pausa?</Label>
          <div className="-mt-2 flex flex-wrap gap-2">
            {[true, false].map((pauses) => (
              <ChoiceChip
                key={String(pauses)}
                tone="peach"
                selected={form.pauses === pauses}
                onClick={() => set({ pauses })}
              >
                {pauses ? "Sim" : "Não"}
              </ChoiceChip>
            ))}
          </div>
        </>
      ) : null}

      {noun && units ? (
        <>
          <Label>Pausa a cada</Label>
          <div className="-mt-2">
            <Stepper
              value={form.pauseEvery}
              min={PAUSE_EVERY_LIMITS.min}
              max={PAUSE_EVERY_LIMITS.max}
              unit={form.pauseEvery === 1 ? noun.one : noun.many}
              onChange={(pauseEvery) =>
                set({
                  pauseEvery,
                  currentUnit: Math.min(form.currentUnit, pauseEvery),
                })
              }
            />
          </div>
          <Label>A pausa dura</Label>
          <div className="-mt-2">
            <Stepper
              value={form.pauseDays}
              min={PAUSE_DAYS_LIMITS.min}
              max={PAUSE_DAYS_LIMITS.max}
              unit={form.pauseDays === 1 ? "dia" : "dias"}
              onChange={(pauseDays) => set({ pauseDays })}
            />
          </div>
          {canFix ? (
            <FixButton onClick={() => set({ fixPosition: true })}>
              {noun.fix}
            </FixButton>
          ) : null}
        </>
      ) : null}

      {form.kind === "pill" || (units && askPosition) ? (
        <div className="flex w-full">
          {form.kind === "pill" ? (
            <div className="flex flex-col w-1/2">
              <Label>Horário</Label>
              <TimeSelect
                hour={hour}
                minute={minute}
                onChange={(t) => set({ pillTime: `${t.hour}:${t.minute}` })}
              />
            </div>
          ) : null}
          {noun && units && askPosition ? (
            <div className="flex flex-col w-1/2">
              <Label>{noun.current}</Label>
              <DatePickerField
                typeable
                tone="peach"
                label={noun.current}
                value={toDate(form.currentUnitStart)}
                maxDate={toDate(today)}
                onChange={(date) => set({ currentUnitStart: toDay(date) })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {noun && units && askPosition ? (
        <>
          <Label>{noun.which}</Label>
          <div className="-mt-2 flex flex-wrap gap-2">
            {Array.from({ length: form.pauseEvery }, (_, i) => i + 1).map(
              (n) => (
                <ChoiceChip
                  key={n}
                  tone="peach"
                  selected={form.currentUnit === n}
                  onClick={() => set({ currentUnit: n })}
                >
                  {`${n}${noun.ordinal}`}
                </ChoiceChip>
              ),
            )}
          </div>
        </>
      ) : null}

      {methodMode(form.kind, form.pauses) === "continuous" &&
      form.kind !== "pill" ? (
        <p className="text-sm font-semibold text-ink-read">
          Nada mais a configurar: você registra sangramentos quando acontecerem.
        </p>
      ) : null}
    </BottomSheet>
  );
}
