"use client";

import {
  ArrowsClockwiseIcon,
  TestTubeIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
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
import { DatePickerField } from "./DatePickerField";
import { TimeSelect } from "./TimeSelect";

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao exame"),
});

/** Status escolhíveis no modal (completed só via check no card). */
const STATUS_OPTIONS: ExamStatus[] = [
  "to_schedule",
  "scheduled",
  "result_available",
];

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
    if (status !== "result_available") {
      setPendingFile(undefined);
      setRemoveAttachment(false);
    }
  }, [status]);

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

      {status === "result_available" ? (
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
            const name = pendingFile?.name ?? initial?.attachmentName ?? "";
            const mime = pendingFile?.type ?? initial?.attachmentMime ?? "";
            const size = pendingFile?.size ?? initial?.attachmentSize ?? null;
            const isPdf = mime === "application/pdf";
            return (
              <div className="flex items-center gap-3 rounded-control border border-hairline p-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-control text-xs font-black ${isPdf ? "bg-[#fdecec] text-[#e0574f]" : "bg-[#eaf4ec] text-[#3fa15a]"}`}
                >
                  {isPdf ? "PDF" : "IMG"}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-ink">
                    {name}
                  </span>
                  {size ? (
                    <span className="text-xs font-semibold text-ink-faint">
                      {(size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Trocar arquivo"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-lilac-deep"
                >
                  <ArrowsClockwiseIcon size={19} weight="bold" />
                </button>
                <button
                  type="button"
                  aria-label="Remover anexo"
                  onClick={() => {
                    setPendingFile(undefined);
                    setRemoveAttachment(true);
                  }}
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-[#c98a9a]"
                >
                  <TrashIcon size={19} weight="bold" />
                </button>
              </div>
            );
          })()}
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-bold text-ink">Data (opcional)</span>
          <DatePickerField
            value={date}
            onChange={setDate}
            placeholder="Sem data"
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
