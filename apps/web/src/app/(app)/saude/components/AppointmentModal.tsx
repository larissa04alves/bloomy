"use client";

import { StethoscopeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { ToggleSwitch } from "@/components/toggle-switch";
import type { Appointment, AppointmentInput } from "@/lib/api-types";

import {
  addMonthsIso,
  combineDateTime,
  monthShort,
  splitDateTime,
} from "../hooks/format";
import { DatePickerField } from "./DatePickerField";
import { TimeSelect } from "@/components/time-select";

const schema = z.object({
  professional: z.string().trim().min(1, "Quem é o profissional?"),
  specialty: z.string(),
  location: z.string(),
  remindDayBefore: z.boolean(),
});

type ApptStatus = AppointmentInput["status"];
/** Prazo do "a agendar": "keep" = mantém o `suggestedAt` atual; null = sem prazo; N = hoje + N meses. */
type Due = "keep" | null | 1 | 3 | 6 | 12;

const STATUS_OPTIONS: { value: ApptStatus; label: string }[] = [
  { value: "to_schedule", label: "A agendar" },
  { value: "scheduled", label: "Agendada" },
];
const DUE_MONTHS = [1, 3, 6, 12] as const;

export function AppointmentModal({
  open,
  onOpenChange,
  initial,
  initialStatus,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Appointment;
  initialStatus?: ApptStatus;
  onSubmit: (input: AppointmentInput) => void;
}) {
  const [status, setStatus] = useState<ApptStatus>("to_schedule");
  const [due, setDue] = useState<Due>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const prefilledRef = useRef(false);

  const form = useForm({
    defaultValues: {
      professional: "",
      specialty: "",
      location: "",
      remindDayBefore: false,
    },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      const base = {
        professional: value.professional.trim(),
        specialty: value.specialty.trim(),
      };
      if (status === "to_schedule") {
        onSubmit({
          ...base,
          status,
          scheduledAt: null,
          suggestedAt:
            due === "keep"
              ? (initial?.suggestedAt ?? null)
              : due === null
                ? null
                : addMonthsIso(due),
        });
      } else {
        if (!date) return;
        onSubmit({
          ...base,
          status,
          scheduledAt: combineDateTime(date, hour, minute),
          suggestedAt: initial?.suggestedAt ?? null,
          location: value.location.trim(),
          remindDayBefore: value.remindDayBefore,
        });
      }
      onOpenChange(false);
    },
  });

  // setFieldValue por campo (form.reset(values) não repopula os inputs montados nesta versão).

  useEffect(() => {
    if (!open) {
      prefilledRef.current = false;
      return;
    }
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    form.setFieldValue("professional", initial?.professional ?? "");
    form.setFieldValue("specialty", initial?.specialty ?? "");
    form.setFieldValue("location", initial?.location ?? "");
    form.setFieldValue("remindDayBefore", initial?.remindDayBefore ?? false);
    setStatus(
      initialStatus ??
        (initial?.status === "to_schedule"
          ? "to_schedule"
          : initial
            ? "scheduled"
            : "to_schedule"),
    );
    setDue(initial?.suggestedAt ? "keep" : null);
    const t = splitDateTime(
      initial?.scheduledAt ?? initial?.suggestedAt ?? null,
    );
    setDate(t.date);
    setHour(t.hour);
    setMinute(t.minute);
  }, [open, initial, initialStatus, form]);

  const scheduled = status === "scheduled";
  const scheduling = initial?.status === "to_schedule" && scheduled;
  const title = !initial
    ? "Adicionar consulta"
    : scheduling
      ? "Agendar consulta"
      : "Editar consulta";
  const submitLabel = !initial ? "Adicionar" : scheduling ? "Agendar" : "Salvar";
  const inputCls =
    "rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      tone="lilac"
      icon={<StethoscopeIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit || (scheduled && !date)}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {submitLabel}
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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((o) => (
            <ChoiceChip
              key={o.value}
              selected={status === o.value}
              onClick={() => setStatus(o.value)}
            >
              {o.label}
            </ChoiceChip>
          ))}
        </div>
      </div>

      {scheduled ? (
        <>
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
                <span className="text-sm font-bold text-ink">
                  Lembrar 1 dia antes
                </span>
                <ToggleSwitch
                  checked={field.state.value}
                  onCheckedChange={(v) => field.handleChange(v)}
                  label="Lembrar 1 dia antes"
                />
              </div>
            )}
          </form.Field>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink">
            Agendar até (opcional)
          </span>
          <div className="flex flex-wrap gap-2">
            {initial?.suggestedAt ? (
              <ChoiceChip
                selected={due === "keep"}
                onClick={() => setDue("keep")}
              >
                Até {monthShort(initial.suggestedAt)}
              </ChoiceChip>
            ) : null}
            <ChoiceChip selected={due === null} onClick={() => setDue(null)}>
              Sem prazo
            </ChoiceChip>
            {DUE_MONTHS.map((n) => (
              <ChoiceChip key={n} selected={due === n} onClick={() => setDue(n)}>
                {n === 1 ? "1 mês" : `${n} meses`}
              </ChoiceChip>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
