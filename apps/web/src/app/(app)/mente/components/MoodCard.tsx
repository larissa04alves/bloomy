"use client";

import { MOOD_ORDER, type Mood } from "@/lib/api-types";
import { cn } from "@bloomy/ui/lib/utils";

import { MOOD_LABEL, MoodFaceIcon } from "@/components/mood-face-icon";

export function MoodCard({
  value,
  onSelect,
}: {
  value: Mood | null;
  onSelect: (mood: Mood) => void;
}) {
  return (
    <section className="rounded-card-lg bg-lilac-tint p-4.5">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-ink">
          Como você está se sentindo hoje?
        </h2>
        {value ? (
          <span className="shrink-0 text-xs font-bold whitespace-nowrap text-lilac-deep">
            registrado ✓
          </span>
        ) : null}
      </div>
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
