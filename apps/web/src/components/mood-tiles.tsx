"use client";

import { cn } from "@bloomy/ui/lib/utils";

import { MOOD_LABEL, MoodFaceIcon } from "@/components/mood-face-icon";
import { MOOD_ORDER } from "@/lib/api-types";

/** Fileira de humores da Hoje. Mesmas faces e rótulos do card da Mente — as duas
 *  telas gravam o mesmo check-in do dia, então precisam falar a mesma língua. */
export function MoodTiles({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex justify-between">
      {MOOD_ORDER.map((mood, i) => {
        const selected = value === i;
        return (
          <button
            key={mood}
            type="button"
            aria-label={MOOD_LABEL[mood]}
            aria-pressed={selected}
            onClick={() => onChange(i)}
            className={cn(
              "grid size-13 place-items-center rounded-[16px] transition-colors",
              selected ? "bg-lilac shadow-btn" : "bg-lilac-tint-soft",
            )}
          >
            <MoodFaceIcon mood={mood} size={28} color={selected ? "#ffffff" : "#c7beda"} />
          </button>
        );
      })}
    </div>
  );
}
