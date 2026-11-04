"use client";

import { PlantIcon } from "@phosphor-icons/react";

import type { BodyErrors, BodyField } from "../hooks/format";
import { PassoLayout } from "./PassoLayout";

const INPUT =
  "w-full bg-transparent py-3 font-display text-lg font-bold text-ink outline-none placeholder:text-ink-faint";

export function PassoSobreVoce({
  total,
  heightRaw,
  weightRaw,
  birthRaw,
  errors,
  canContinue,
  pending,
  onHeight,
  onWeight,
  onBirthDate,
  onBlurField,
  onNext,
  onSkip,
}: {
  total: number;
  heightRaw: string;
  weightRaw: string;
  /** `dd/mm/aaaa`, já mascarado pelo hook. */
  birthRaw: string;
  /** Erros já filtrados pelo hook (só campos visitados). */
  errors: BodyErrors;
  canContinue: boolean;
  pending: boolean;
  onHeight: (raw: string) => void;
  onWeight: (raw: string) => void;
  onBirthDate: (value: string) => void;
  onBlurField: (field: BodyField) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const fields = [
    {
      key: "height",
      label: "Altura",
      unit: "cm",
      input: (
        <input
          inputMode="numeric"
          value={heightRaw}
          onChange={(e) => onHeight(e.target.value)}
          onBlur={() => onBlurField("height")}
          placeholder="165"
          aria-label="Altura em centímetros"
          className={INPUT}
        />
      ),
      error: errors.height,
    },
    {
      key: "weight",
      label: "Peso",
      unit: "kg",
      input: (
        <input
          inputMode="decimal"
          value={weightRaw}
          onChange={(e) => onWeight(e.target.value)}
          onBlur={() => onBlurField("weight")}
          placeholder="62,5"
          aria-label="Peso em quilos"
          className={INPUT}
        />
      ),
      error: errors.weight,
    },
    {
      key: "birthDate",
      label: "Data de nascimento",
      unit: null,
      input: (
        <input
          inputMode="numeric"
          value={birthRaw}
          onChange={(e) => onBirthDate(e.target.value)}
          onBlur={() => onBlurField("birthDate")}
          placeholder="dd/mm/aaaa"
          aria-label="Data de nascimento"
          className={INPUT}
        />
      ),
      error: errors.birthDate,
    },
  ];

  return (
    <PassoLayout
      step={1}
      total={total}
      tone="lilac"
      icon={<PlantIcon size={52} weight="fill" />}
      title="Sobre você"
      subtitle="Usamos para sugerir suas metas."
      ctaLabel="Continuar"
      ctaDisabled={!canContinue}
      pending={pending}
      onNext={onNext}
      onSkip={onSkip}
    >
      <div className="flex w-full flex-col gap-4 text-left">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink-read">{f.label}</span>
            <span className="flex items-center gap-2 rounded-control border border-hairline bg-white px-4">
              {f.input}
              {f.unit ? (
                <span className="text-sm font-semibold text-ink-faint">{f.unit}</span>
              ) : null}
            </span>
            {f.error ? (
              <span className="text-xs font-semibold text-coral">{f.error}</span>
            ) : null}
          </label>
        ))}
      </div>
    </PassoLayout>
  );
}
