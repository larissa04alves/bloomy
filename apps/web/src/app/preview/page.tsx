"use client";

import { DropIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";
import { IconChip } from "@/components/icon-chip";
import { MoodTiles } from "@/components/mood-tiles";
import { ProgressBar } from "@/components/progress-bar";
import { Stepper } from "@/components/stepper";
import { ToggleSwitch } from "@/components/toggle-switch";

export default function PreviewPage() {
  const [mood, setMood] = useState<number | null>(2);
  const [ml, setMl] = useState(250);
  const [freq, setFreq] = useState(1);
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6">
      <MoodTiles value={mood} onChange={setMood} />
      <div className="flex gap-2">
        <IconChip tone="lilac" icon={<DropIcon size={22} weight="fill" />} />
        <IconChip tone="green" icon={<DropIcon size={22} weight="fill" />} />
        <IconChip tone="pink" icon={<DropIcon size={22} weight="fill" />} />
        <IconChip tone="coral" icon={<DropIcon size={22} weight="fill" />} />
      </div>
      <ProgressBar value={0.62} />
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <ChoiceChip key={n} selected={freq === n} onClick={() => setFreq(n)}>
            {n}x
          </ChoiceChip>
        ))}
      </div>
      <Stepper value={ml} min={0} max={1000} step={50} onChange={setMl} unit="ml" />
      <ToggleSwitch checked={on} onCheckedChange={setOn} label="Lembrete" />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-lilac px-5 py-3 font-display font-bold text-white shadow-btn"
      >
        Abrir sheet
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Adicionar água"
        tone="lilac"
        icon={<DropIcon size={22} weight="fill" />}
        footer={
          <button className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn">
            Registrar
          </button>
        }
      >
        <Stepper value={ml} min={0} max={1000} step={50} onChange={setMl} unit="ml" />
      </BottomSheet>
    </div>
  );
}
