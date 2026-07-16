"use client";

import type { WeekMood } from "@/lib/api-types";

import { MOOD_RECORD_COLOR, weekSentence } from "../hooks/mente-helpers";

const WEEKDAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function SemanaCard({ days }: { days: WeekMood[] }) {
  return (
    <section className="rounded-card bg-white p-4 shadow-card">
      <h2 className="mb-3.5 font-display text-base font-bold text-ink">
        Como foi sua semana
      </h2>
      <div className="flex justify-between">
        {days.map((d, i) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5">
            <span
              className="size-5.5 rounded-full"
              style={
                d.mood
                  ? { background: MOOD_RECORD_COLOR[d.mood] }
                  : { border: "2px dashed #e2d8f0" }
              }
            />
            <span className="text-xs font-bold text-ink-faint">
              {WEEKDAY_LETTERS[i]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink-read">
        {weekSentence(days)}
      </p>
    </section>
  );
}
