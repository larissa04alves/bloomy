"use client";

import { PillIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao remédio"),
  dose: z.string(),
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
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { name: string; dose?: string; stock?: number; times: string[] }) => void;
}) {
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [newTime, setNewTime] = useState("12:00");

  const form = useForm({
    defaultValues: { name: "", dose: "", stock: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        dose: value.dose?.trim() || undefined,
        stock: value.stock ? Number(value.stock) : undefined,
        times,
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setTimes(["09:00"]);
    }
  }, [open, form]);

  const addTime = () => setTimes((prev) => [...new Set([...prev, newTime])].sort());
  const removeTime = (t: string) => setTimes((prev) => prev.filter((x) => x !== t));

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Cadastrar remédio"
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
              Cadastrar
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Nome do remédio"
            className="rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
          />
        )}
      </form.Field>

      <div className="flex gap-2">
        <form.Field name="dose">
          {(field) => (
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Dose (ex.: 1 comp.)"
              className="flex-1 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          )}
        </form.Field>
        <form.Field name="stock">
          {(field) => (
            <input
              value={field.state.value}
              inputMode="numeric"
              onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
              placeholder="Estoque"
              className="w-28 rounded-control border border-hairline bg-white px-4 py-3 text-[14px] font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
            />
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-bold text-ink">Frequência</span>
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
        <span className="text-[13px] font-bold text-ink">Horários</span>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 rounded-full bg-coral-tint px-3 py-2 text-[13px] font-semibold text-coral"
            >
              {t}
              <button type="button" aria-label={`Remover ${t}`} onClick={() => removeTime(t)}>
                <XIcon size={14} weight="bold" />
              </button>
            </span>
          ))}
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="rounded-control border border-hairline bg-white px-3 py-2 text-[13px] font-semibold text-ink focus:border-lilac focus:outline-none"
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
