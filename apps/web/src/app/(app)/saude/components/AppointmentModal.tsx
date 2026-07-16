"use client";

import { StethoscopeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { Appointment, AppointmentInput } from "@/lib/api-types";

import { combineDateTime, splitDateTime } from "../hooks/format";
import { DatePickerField } from "./DatePickerField";
import { TimeSelect } from "./TimeSelect";

const schema = z.object({
  professional: z.string().trim().min(1, "Quem é o profissional?"),
  specialty: z.string(),
  location: z.string(),
  remindDayBefore: z.boolean(),
});

export function AppointmentModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Appointment;
  onSubmit: (input: AppointmentInput) => void;
}) {
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");

  const form = useForm({
    defaultValues: {
      professional: "",
      specialty: "",
      location: "",
      remindDayBefore: false,
    },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      if (!date) return;
      onSubmit({
        professional: value.professional.trim(),
        specialty: value.specialty.trim(),
        scheduledAt: combineDateTime(date, hour, minute),
        location: value.location.trim(),
        remindDayBefore: value.remindDayBefore,
      });
      onOpenChange(false);
    },
  });

  // setFieldValue por campo (form.reset(values) não repopula os inputs montados nesta versão).
  useEffect(() => {
    if (!open) return;
    form.setFieldValue("professional", initial?.professional ?? "");
    form.setFieldValue("specialty", initial?.specialty ?? "");
    form.setFieldValue("location", initial?.location ?? "");
    form.setFieldValue("remindDayBefore", initial?.remindDayBefore ?? false);
    const t = splitDateTime(initial?.scheduledAt ?? initial?.suggestedAt ?? null);
    setDate(t.date);
    setHour(t.hour);
    setMinute(t.minute);
  }, [open, initial, form]);

  const isEdit = Boolean(initial);
  const inputCls =
    "rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar consulta" : "Agendar consulta"}
      tone="lilac"
      icon={<StethoscopeIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit || !date}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {isEdit ? "Salvar" : "Agendar"}
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="professional">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Profissional"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Profissional (ex.: Dra. Marina)"
            className={inputCls}
          />
        )}
      </form.Field>
      <form.Field name="specialty">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Especialidade"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Especialidade (ex.: Nutricionista)"
            className={inputCls}
          />
        )}
      </form.Field>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-bold text-ink">Data</span>
          <DatePickerField value={date} onChange={setDate} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink">Hora</span>
          <TimeSelect
            hour={hour}
            minute={minute}
            onChange={(t) => {
              setHour(t.hour);
              setMinute(t.minute);
            }}
          />
        </div>
      </div>

      <form.Field name="location">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Local"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Local (opcional)"
            className={inputCls}
          />
        )}
      </form.Field>
      <form.Field name="remindDayBefore">
        {(field) => (
          <div className="flex items-center justify-between rounded-control bg-lilac-tint-soft px-4 py-3">
            <span className="text-sm font-bold text-ink">Lembrar 1 dia antes</span>
            <ToggleSwitch
              checked={field.state.value}
              onCheckedChange={(v) => field.handleChange(v)}
              label="Lembrar 1 dia antes"
            />
          </div>
        )}
      </form.Field>
    </BottomSheet>
  );
}
