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

import { formatDateBR } from "../hooks/format";

// Posição do calendário relativa ao Drawer.Content (px). Abre pra cima, ancorado ao campo.
type Pos = { left: number; bottom: number };

export function DatePickerField({
  value,
  onChange,
  placeholder = "Escolha a data",
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = btnRef.current;
    const host = btn?.closest<HTMLElement>('[role="dialog"]') ?? document.body;
    setContainer(host);

    const place = () => {
      if (!btn) return;
      const b = btn.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      setPos({ left: b.left - h.left, bottom: h.bottom - b.top + 4 });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-control border border-hairline bg-white px-4 py-3 text-sm font-semibold focus:border-lilac focus:outline-none"
      >
        <span className={value ? "text-ink" : "text-ink-faint"}>
          {value ? formatDateBR(value) : placeholder}
        </span>
        <CalendarBlankIcon
          size={20}
          weight="fill"
          className="text-lilac-deep"
        />
      </button>

      {open && pos && container
        ? createPortal(
            <>
              <div
                className="absolute inset-0 z-40"
                onPointerDown={() => setOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  left: pos.left,
                  bottom: pos.bottom,
                  zIndex: 50,
                }}
                className="rounded-card border border-hairline bg-white p-1 shadow-card"
              >
                <Calendar
                  mode="single"
                  selected={value}
                  onSelect={(date) => {
                    onChange(date);
                    setOpen(false);
                  }}
                  locale={ptBR}
                  showOutsideDays
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
