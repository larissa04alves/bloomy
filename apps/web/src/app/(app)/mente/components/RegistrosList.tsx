"use client";

import type { Checkin } from "@/lib/api-types";
import { dayFor } from "@/server/shared/day";

import { MoodFaceIcon } from "./MoodFaceIcon";
import { MOOD_RECORD_COLOR, relativeDay } from "../hooks/mente-helpers";

export function RegistrosList({ records }: { records: Checkin[] }) {
  const today = dayFor();

  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">Seus registros</h2>
      {records.length === 0 ? (
        <div className="rounded-card border border-dashed border-hairline p-5 text-center text-sm font-semibold text-ink-read">
          Seus registros vão aparecer aqui, no seu tempo.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {records.map((c) => (
            <article key={c.id} className="rounded-card bg-white p-3.5 shadow-card-sm">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-lilac-deep">
                  {relativeDay(c.day, today)}
                </span>
                {c.mood ? (
                  <MoodFaceIcon mood={c.mood} size={18} color={MOOD_RECORD_COLOR[c.mood]} />
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-[#6b6386]">{c.note}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
