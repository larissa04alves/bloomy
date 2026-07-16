"use client";

import type { Mood } from "@/lib/api-types";
import { cn } from "@bloomy/ui/lib/utils";

import { MoodFaceIcon } from "./MoodFaceIcon";
import { MOOD_ORDER } from "../hooks/mente-helpers";

const MOOD_LABEL: Record<Mood, string> = {
  sad: "Muito pra baixo",
  meh: "Pra baixo",
  neutral: "Neutro",
  good: "Bem",
  great: "Ótimo",
};

export function MoodCard({
  value,
  onSelect,
}: {
  value: Mood | null;
  onSelect: (mood: Mood) => void;
}) {
  return (
    <section className="rounded-card-lg bg-lilac-tint p-4.5">
      <h2 className="mb-3.5 font-display text-base font-bold text-ink">
        Como você está se sentindo agora?
      </h2>
      <div className="flex justify-between">
        {MOOD_ORDER.map((mood) => {
          const selected = value === mood;
          return (
            <button
              key={mood}
              type="button"
              aria-label={MOOD_LABEL[mood]}
              aria-pressed={selected}
              onClick={() => onSelect(mood)}
              className={cn(
                "grid size-13 place-items-center rounded-control motion-safe:transition-colors",
                selected ? "bg-lilac shadow-btn" : "bg-white",
              )}
            >
              <MoodFaceIcon
                mood={mood}
                size={selected ? 26 : 24}
                color={selected ? "#ffffff" : "#c7beda"}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
