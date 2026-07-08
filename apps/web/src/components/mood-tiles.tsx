"use client";

import {
  HeartIcon,
  type Icon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
  SmileyWinkIcon,
} from "@phosphor-icons/react";

import { cn } from "@bloomy/ui/lib/utils";

const FACES: { Icon: Icon; label: string }[] = [
  { Icon: SmileySadIcon, label: "Triste" },
  { Icon: SmileyMehIcon, label: "Neutro" },
  { Icon: SmileyIcon, label: "Bem" },
  { Icon: SmileyWinkIcon, label: "Ótimo" },
  { Icon: HeartIcon, label: "Radiante" },
];

export function MoodTiles({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex justify-between">
      {FACES.map(({ Icon, label }, i) => {
        const selected = value === i;
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            onClick={() => onChange(i)}
            className={cn(
              "grid size-13 place-items-center rounded-[16px] transition-colors",
              selected ? "bg-lilac shadow-btn" : "bg-lilac-tint-soft",
            )}
          >
            <Icon
              size={28}
              weight="fill"
              className={selected ? "text-white" : "text-[#c7beda]"}
            />
          </button>
        );
      })}
    </div>
  );
}
