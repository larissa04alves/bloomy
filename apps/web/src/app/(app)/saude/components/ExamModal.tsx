"use client";

import { TestTubeIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
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
import { AttachmentPreview } from "./AttachmentPreview";
import { DatePickerField } from "./DatePickerField";
import { TimeSelect } from "./TimeSelect";

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao exame"),
});

/** Status escolhíveis no modal (completed só via check no card). */
const STATUS_OPTIONS: ExamStatus[] = ["to_schedule", "scheduled"];

export type AttachmentIntent = { file?: File; remove?: boolean };

export function ExamModal({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Exam;
  onSubmit: (input: ExamInput, attachment: AttachmentIntent) => void;
}) {
  const [status, setStatus] = useState<ExamStatus>("to_schedule");
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [pendingFile, setPendingFile] = useState<File | undefined>();
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      // "agendada" exige quando: sem data o back rejeita (400) e o card ficaria sem horário.
      if (status === "scheduled" && !date) return;
      onSubmit(
        {
          name: value.name.trim(),
          status,
          scheduledAt: date ? combineDateTime(date, hour, minute) : null,
        },
        { file: pendingFile, remove: removeAttachment },
      );
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldValue("name", initial?.name ?? "");
    setStatus(
      initial && initial.status !== "completed"
        ? initial.status
        : "to_schedule",
    );
    const t = splitDateTime(initial?.scheduledAt ?? null);
    setDate(t.date);
    setHour(t.hour);
    setMinute(t.minute);
    setPendingFile(undefined);
    setRemoveAttachment(false);
  }, [open, initial, form]);

  useEffect(() => {
    if (status !== "awaiting_result") {
      setPendingFile(undefined);
      setRemoveAttachment(false);
    }
  }, [status]);

  const isEdit = Boolean(initial);
  const dateRequired = status === "scheduled";

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
              disabled={!canSubmit || (dateRequired && !date)}
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
            <ChoiceChip
              key={s}
              selected={status === s}
              onClick={() => setStatus(s)}
            >
              {EXAM_STATUS_LABELS[s]}
            </ChoiceChip>
          ))}
        </div>
      </div>

      {status === "awaiting_result" ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-ink">Anexo do resultado</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPendingFile(f);
                setRemoveAttachment(false);
              }
            }}
          />
          {(() => {
            const showFile =
              !removeAttachment &&
              (pendingFile || (initial?.attachmentName ?? null));
            if (!showFile) {
              return (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-control border border-dashed border-lilac bg-lilac-tint px-4 py-4 text-center text-sm font-bold text-lilac-deep"
                >
                  <UploadSimpleIcon
                    size={18}
                    weight="bold"
                    className="mr-1 inline"
                  />
                  Anexar resultado
                  <span className="mt-1 block text-xs font-semibold text-ink-faint">
                    PDF ou imagem · até 4 MB
                  </span>
                </button>
              );
            }
            return (
              <AttachmentPreview
                name={pendingFile?.name ?? initial?.attachmentName ?? ""}
                mime={pendingFile?.type ?? initial?.attachmentMime ?? ""}
                size={pendingFile?.size ?? initial?.attachmentSize ?? null}
                onSwap={() => fileInputRef.current?.click()}
                onRemove={() => {
                  setPendingFile(undefined);
                  setRemoveAttachment(true);
                }}
              />
            );
          })()}
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-bold text-ink">
            {dateRequired ? "Data" : "Data (opcional)"}
          </span>
          <DatePickerField
            value={date}
            onChange={setDate}
            placeholder={dateRequired ? "Escolha a data" : "Sem data"}
          />
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
