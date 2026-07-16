"use client";

import { TestTubeIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { z } from "zod";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import {
  EXAM_STATUS_LABELS,
  type Exam,
  type ExamInput,
  type ExamStatus,
} from "@/lib/api-types";

import { combineDateTime, splitDateTime } from "../hooks/format";
import { DatePickerField } from "./DatePickerField";
import { TimeSelect } from "./TimeSelect";

const schema = z.object({ name: z.string().trim().min(1, "Dê um nome ao exame") });

/** Status escolhíveis no modal (completed só via check no card). */
const STATUS_OPTIONS: ExamStatus[] = ["to_schedule", "scheduled", "result_available"];

export function ExamModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Exam;
  onSubmit: (input: ExamInput) => void;
}) {
  const [status, setStatus] = useState<ExamStatus>("to_schedule");
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        name: value.name.trim(),
        status,
        scheduledAt: date ? combineDateTime(date, hour, minute) : null,
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldValue("name", initial?.name ?? "");
    setStatus(
      initial && initial.status !== "completed" ? initial.status : "to_schedule",
    );
    const t = splitDateTime(initial?.scheduledAt ?? null);
    setDate(t.date);
    setHour(t.hour);
    setMinute(t.minute);
  }, [open, initial, form]);

  const isEdit = Boolean(initial);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar exame" : "Adicionar exame"}
      tone="lilac"
      icon={<TestTubeIcon size={22} weight="fill" />}
      footer={
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => form.handleSubmit()}
              className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
            >
              {isEdit ? "Salvar" : "Adicionar"}
            </button>
          )}
        </form.Subscribe>
      }
    >
      <form.Field name="name">
        {(field) => (
          <input
            value={field.state.value}
            aria-label="Nome do exame"
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Nome do exame (ex.: Hemograma)"
            className="rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none"
          />
        )}
      </form.Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-ink">Status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <ChoiceChip key={s} selected={status === s} onClick={() => setStatus(s)}>
              {EXAM_STATUS_LABELS[s]}
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-bold text-ink">Data (opcional)</span>
          <DatePickerField value={date} onChange={setDate} placeholder="Sem data" />
        </div>
        {date ? (
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
        ) : null}
      </div>
    </BottomSheet>
  );
}
