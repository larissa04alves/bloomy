"use client";

import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Calendar } from "@bloomy/ui/components/calendar";
import { cn } from "@bloomy/ui/lib/utils";

import { maskBirthDate, parseBrDate } from "@/lib/body";

// Posição do calendário relativa ao Drawer.Content (px). Abre pra cima, ancorado ao campo;
// campo na metade direita alinha pela direita para o calendário não sair da tela.
type Pos = { bottom: number } & ({ left: number } | { right: number });

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatDateBR = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

function parseTyped(raw: string): Date | undefined {
  const iso = parseBrDate(raw);
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Escolha a data",
  minDate,
  maxDate,
  tone = "lilac",
  typeable = false,
  label,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  tone?: "lilac" | "peach";
  /** Campo digitável (dd/mm/aaaa) com o ícone abrindo o calendário. */
  typeable?: boolean;
  /** Nome acessível do campo digitável. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(value ? formatDateBR(value) : "");

  // Data vinda de fora (calendário, rascunho reaberto) reescreve o texto; digitação parcial não.
  const valueKey = value ? formatDateBR(value) : "";
  useEffect(() => {
    if (valueKey) setRaw(valueKey);
  }, [valueKey]);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const anchor = anchorRef.current;
    const host = anchor?.closest<HTMLElement>('[role="dialog"]') ?? document.body;
    setContainer(host);

    const place = () => {
      if (!anchor) return;
      const b = anchor.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      const bottom = h.bottom - b.top + 4;
      setPos(
        b.left - h.left > h.width / 2
          ? { bottom, right: h.right - b.right }
          : { bottom, left: b.left - h.left },
      );
    };
    place();
    window.addEventListener("resize", place);

    document.addEventListener("scroll", place, true);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const field = cn(
    "flex w-full items-center justify-between rounded-control border border-hairline bg-white text-sm font-semibold",
    tone === "peach" ? "focus-within:border-peach" : "focus-within:border-lilac",
  );
  const icon = (
    <CalendarBlankIcon
      size={20}
      weight="fill"
      className={tone === "peach" ? "text-peach-deep" : "text-lilac-deep"}
    />
  );

  const type = (next: string) => {
    const masked = maskBirthDate(next);
    setRaw(masked);
    const date = parseTyped(masked);
    onChange(date && (!minDate || date >= minDate) && (!maxDate || date <= maxDate) ? date : undefined);
  };

  return (
    <>
      <div ref={anchorRef}>
        {typeable ? (
          <div className={field}>
            <input
              inputMode="numeric"
              autoComplete="off"
              aria-label={label}
              placeholder="dd/mm/aaaa"
              value={raw}
              onChange={(e) => type(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 pl-4 text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="button"
              aria-label="Abrir calendário"
              onClick={() => setOpen((o) => !o)}
              className="grid min-h-11 place-items-center px-3"
            >
              {icon}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(field, "px-4 py-3 focus:outline-none")}
          >
            <span className={value ? "text-ink" : "text-ink-faint"}>
              {value ? formatDateBR(value) : placeholder}
            </span>
            {icon}
          </button>
        )}
      </div>

      {open && pos && container
        ? createPortal(
            <>
              <div
                className="absolute inset-0 z-40"
                onPointerDown={() => setOpen(false)}
              />
              <div
                style={{ position: "absolute", zIndex: 50, ...pos }}
                className={cn(
                  "rounded-card border border-hairline bg-white p-1 shadow-card",
                  // O Calendar do shadcn pinta seleção e hoje com as variáveis do tema (lilás).
                  tone === "peach" &&
                    "[--muted:var(--color-peach-tint)] [--primary:var(--color-peach)] [--ring:var(--color-peach)]",
                )}
              >
                <Calendar
                  mode="single"
                  selected={value}
                  defaultMonth={value}
                  onSelect={(date) => {
                    // Tocar de novo no dia selecionado o desmarcaria: no campo de data, mantém a escolha.
                    if (date) {
                      onChange(date);
                      setRaw(formatDateBR(date));
                    }
                    setOpen(false);
                  }}
                  locale={ptBR}
                  showOutsideDays
                  disabled={[
                    ...(minDate ? [{ before: minDate }] : []),
                    ...(maxDate ? [{ after: maxDate }] : []),
                  ]}
                  components={{
                    Chevron: ({
                      orientation,
                      className,
                    }: {
                      orientation?: "left" | "right" | "up" | "down";
                      className?: string;
                    }) =>
                      orientation === "left" ? (
                        <CaretLeftIcon
                          size={16}
                          weight="bold"
                          className={className}
                        />
                      ) : (
                        <CaretRightIcon
                          size={16}
                          weight="bold"
                          className={className}
                        />
                      ),
                  }}
                />
              </div>
            </>,
            container,
          )
        : null}
    </>
  );
}
