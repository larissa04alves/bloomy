"use client";

import { PillIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import type { DoseUnit, Medication, MedicationInput } from "@/lib/api-types";
import {
  DOSE_UNIT_OPTIONS,
  formatQuantity,
  parseQuantity,
  sanitizeQuantity,
  unitLabel,
} from "@/lib/dose";

import { TimeSelect } from "@/components/time-select";

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao remédio"),
  doseAmount: z
    .string()
    .refine((v) => (parseQuantity(v) ?? 0) > 0, "Informe a quantidade da dose"),
  stock: z.string(),
});

const FREQ_TIMES: Record<number, string[]> = {
  1: ["09:00"],
  2: ["09:00", "21:00"],
  3: ["08:00", "14:00", "20:00"],
};

export function MedicationModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Medication;
  onSubmit: (input: MedicationInput) => void;
}) {
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [doseUnit, setDoseUnit] = useState<DoseUnit>("comp");
  const [newHour, setNewHour] = useState("12");
  const [newMinute, setNewMinute] = useState("00");

  const form = useForm({
    defaultValues: { name: "", doseAmount: "1", stock: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        doseAmount: parseQuantity(value.doseAmount) ?? 1,
        doseUnit,
        stock: parseQuantity(value.stock),
        times,
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldValue("name", initial?.name ?? "");
    form.setFieldValue("doseAmount", formatQuantity(initial?.doseAmount ?? 1));
    setDoseUnit(initial?.doseUnit ?? "comp");
    form.setFieldValue(
      "stock",
      initial?.stock != null ? formatQuantity(initial.stock) : "",
    );
    setTimes(initial?.times?.length ? initial.times : ["09:00"]);
  }, [open, initial, form]);

  const addTime = () => {
    const h = (newHour === "" ? "00" : newHour).padStart(2, "0");
    const m = (newMinute === "" ? "00" : newMinute).padStart(2, "0");
    setTimes((prev) => [...new Set([...prev, `${h}:${m}`])].sort());
  };
  const removeTime = (t: string) =>
    setTimes((prev) => prev.filter((x) => x !== t));

  const isEdit = Boolean(initial);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar remédio" : "Cadastrar remédio"}
      tone="coral"
      icon={<PillIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit || times.length === 0}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-coral py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {isEdit ? "Salvar" : "Cadastrar"}
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Nome do remédio"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Nome do remédio"
            className="rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
          />
        )}
      </form.Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Dose</span>
        <div className="flex flex-wrap gap-2">
          {DOSE_UNIT_OPTIONS.map((u) => (
            <ChoiceChip
              key={u}
              tone="coral"
              selected={doseUnit === u}
              onClick={() => setDoseUnit(u)}
            >
              {unitLabel(2, u)}
            </ChoiceChip>
          ))}
        </div>
        <div className="flex gap-2">
          <form.Field name="doseAmount">
            {(field) => (
              <label className="flex flex-1 items-center gap-2 rounded-control border border-hairline bg-white px-4 py-3 focus-within:border-lilac">
                <input
                  value={field.state.value}
                  aria-label="Quantidade dose"
                  inputMode="decimal"
                  onChange={(e) =>
                    field.handleChange(sanitizeQuantity(e.target.value))
                  }
                  placeholder="1"
                  className="w-full min-w-0 bg-transparent text-sm font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <span className="shrink-0 text-sm font-semibold text-ink-read">
                  dose
                </span>
              </label>
            )}
          </form.Field>
          <form.Field name="stock">
            {(field) => (
              <label className="flex flex-1 items-center gap-2 rounded-control border border-hairline bg-white px-4 py-3 focus-within:border-lilac">
                <input
                  value={field.state.value}
                  aria-label="Estoque"
                  inputMode="decimal"
                  onChange={(e) =>
                    field.handleChange(sanitizeQuantity(e.target.value))
                  }
                  placeholder="Estoque"
                  className="w-full min-w-0 bg-transparent text-sm font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
                />
                <span className="shrink-0 text-sm font-semibold text-ink-read">
                  {unitLabel(2, doseUnit)}
                </span>
              </label>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Frequência</span>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <ChoiceChip
              key={n}
              tone="coral"
              selected={times.length === n}
              onClick={() => setTimes(FREQ_TIMES[n])}
            >
              {n}x ao dia
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Horários</span>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-coral-tint px-3 py-2 text-sm font-semibold text-coral"
            >
              {t}
              <button
                type="button"
                aria-label={`Remover ${t}`}
                onClick={() => removeTime(t)}
              >
                <XIcon size={14} weight="bold" />
              </button>
            </span>
          ))}
          <TimeSelect
            hour={newHour}
            minute={newMinute}
            onChange={(t) => {
              setNewHour(t.hour);
              setNewMinute(t.minute);
            }}
          />
          <button
            type="button"
            aria-label="Adicionar horário"
            onClick={addTime}
            className="grid size-9 place-items-center rounded-full bg-coral-tint text-coral"
          >
            <PlusIcon size={16} weight="bold" />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
