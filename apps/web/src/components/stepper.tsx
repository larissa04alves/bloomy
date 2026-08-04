"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
  format,
  parse,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  unit?: string;
  /** Como exibir o valor (ex.: gramas → "64,2"). Sem isso, mostra o número cru. */
  format?: (value: number) => string;
  /** Habilita digitar o valor. Recebe o texto, devolve a unidade interna ou null. */
  parse?: (text: string) => number | null;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const display = format ? format(value) : String(value);

  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const cancelling = useRef(false);

  const commit = () => {
    if (cancelling.current) {
      cancelling.current = false;
      setDraft(null);
      return;
    }
    if (draft === null || !parse) return;
    const next = parse(draft);
    if (next !== null && Number.isFinite(next)) onChange(clamp(next));
    setDraft(null);
  };

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="grid size-12 place-items-center rounded-full bg-lilac-tint text-lilac-deep disabled:text-ink-faint"
      >
        <MinusIcon size={22} weight="bold" />
      </button>
      <div className="flex flex-col items-center">
        {editing ? (
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus -- o input só existe após o toque no número
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelling.current = true;
                setDraft(null);
              }
            }}
            aria-label="Valor"
            className="w-32 border-b-2 border-dashed border-control-off bg-transparent text-center font-display text-4xl font-bold text-ink outline-none"
          />
        ) : parse ? (
          <button
            type="button"
            onClick={() => {
              cancelling.current = false;
              setDraft(display);
            }}
            aria-label={`Valor atual: ${display}${unit ? ` ${unit}` : ""}. Toque para digitar.`}
            className="border-b-2 border-dashed border-control-off font-display text-4xl font-bold text-ink"
          >
            {display}
          </button>
        ) : (
          <span className="font-display text-4xl font-bold text-ink">{display}</span>
        )}
        {unit ? <span className="text-sm font-semibold text-ink-read">{unit}</span> : null}
      </div>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="grid size-12 place-items-center rounded-full bg-lilac text-white shadow-btn disabled:opacity-60"
      >
        <PlusIcon size={22} weight="bold" />
      </button>
    </div>
  );
}
