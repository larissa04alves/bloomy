"use client";

import {
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";

import { Calendar } from "@bloomy/ui/components/calendar";

import { formatDateBR } from "../hooks/format";

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
  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha ao tocar fora do campo/calendário.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
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

      {open ? (
        <div className="absolute top-full left-0 z-20 mt-1 rounded-card border border-hairline bg-white p-1 shadow-card">
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
      ) : null}
    </div>
  );
}
