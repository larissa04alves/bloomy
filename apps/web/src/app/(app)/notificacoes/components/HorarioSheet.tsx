"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { pad2, TimeSelect } from "@/components/time-select";
import type { Tone } from "@/lib/tone";

/** "18:00" → { hour: "18", minute: "00" } */
function split(time: string): { hour: string; minute: string } {
  const [hour = "18", minute = "00"] = time.split(":");
  return { hour, minute };
}

export function HorarioSheet({
  open,
  onOpenChange,
  title,
  tone,
  icon,
  time,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tone: Tone;
  icon: ReactNode;
  /** Horário atual em HH:MM. */
  time: string;
  onSave: (time: string) => void;
}) {
  const [draft, setDraft] = useState(() => split(time));

  // Semeia só na abertura, mesmo motivo do MetaSheet: `time` muda de forma otimista
  // ao salvar e re-semear no meio da edição travaria os campos.
  useEffect(() => {
    if (open) setDraft(split(time));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependência deliberada só em `open`
  }, [open]);

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
          onClick={() => {
            onSave(`${pad2(draft.hour)}:${pad2(draft.minute)}`);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          Salvar
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-read">Horário do lembrete</span>
        <TimeSelect
          hour={draft.hour}
          minute={draft.minute}
          onChange={(next) => setDraft(next)}
        />
      </div>
      <p className="text-sm font-semibold text-ink-faint">
        A notificação chega nesse horário, todo dia.
      </p>
    </BottomSheet>
  );
}
