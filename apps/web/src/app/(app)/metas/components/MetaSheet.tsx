"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { Stepper } from "@/components/stepper";
import type { Tone } from "@/lib/tone";

/** Linha sob o título (ex.: recomendação da água). `restore` vira o link que volta
 *  o campo `key` para `value`. */
export type SheetSubtitle = {
  text: string;
  restore?: { key: string; value: number };
};

/** Campo de texto livre acima dos steppers (ex.: peso, quando não há pesagem). */
export type SheetTextInput = {
  label: string;
  unit: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (raw: string) => void;
  onBlur: () => void;
};

export type SheetField = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
};

export function MetaSheet({
  open,
  onOpenChange,
  title,
  icon,
  tone,
  fields,
  hint,
  subtitle,
  textInput,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  tone: Tone;
  fields: SheetField[];
  /** Linha viva sob os steppers (ex.: "≈ 4 porções por dia"). */
  hint?: (values: Record<string, number>) => string;
  subtitle?: (values: Record<string, number>) => SheetSubtitle | null;
  textInput?: SheetTextInput;
  /** `false` mantém a sheet aberta (ex.: falhou registrar o peso). */
  onSave: (values: Record<string, number>) => void | boolean | Promise<void | boolean>;
}) {
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Semeia o rascunho só na abertura: `fields` é criado inline pelo caller, então
  // entrar na dep list re-semearia a cada render e travaria a edição.
  useEffect(() => {
    if (open) setDraft(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependência deliberada só em `open`, ver comentário acima
  }, [open]);

  const values: Record<string, number> = {
    ...Object.fromEntries(fields.map((f) => [f.key, f.value])),
    ...draft,
  };

  const line = subtitle?.(values) ?? null;
  const restore = ({ key, value }: { key: string; value: number }) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={icon}
      tone={tone}
      footer={
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              if ((await onSave(values)) !== false) onOpenChange(false);
            } finally {
              setSaving(false);
            }
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn disabled:opacity-60"
        >
          Salvar
        </button>
      }
    >
      {line ? (
        <p className="text-center text-sm font-semibold text-ink-read">
          {line.text}
          {line.restore ? (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => restore(line.restore!)}
                className="font-bold text-lilac-deep underline"
              >
                restaurar
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      {textInput ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-read">{textInput.label}</span>
          <span className="flex items-center gap-2 rounded-control border border-hairline bg-white px-4">
            <input
              inputMode="decimal"
              value={textInput.value}
              onChange={(e) => textInput.onChange(e.target.value)}
              onBlur={textInput.onBlur}
              placeholder={textInput.placeholder}
              aria-label={textInput.label}
              className="w-full bg-transparent py-3 font-display text-lg font-bold text-ink outline-none placeholder:text-ink-faint"
            />
            <span className="text-sm font-semibold text-ink-faint">{textInput.unit}</span>
          </span>
          {textInput.error ? (
            <span className="text-xs font-semibold text-coral">{textInput.error}</span>
          ) : null}
        </label>
      ) : null}
      {fields.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-read">{f.label}</span>
          <Stepper
            value={values[f.key]!}
            min={f.min}
            max={f.max}
            step={f.step}
            unit={f.unit}
            onChange={(next) => setDraft((d) => ({ ...d, [f.key]: next }))}
          />
        </div>
      ))}
      {hint ? (
        <p className="text-center text-sm font-semibold text-ink-faint">
          {hint(values)}
        </p>
      ) : null}
    </BottomSheet>
  );
}
