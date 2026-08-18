"use client";

import { MoodTiles } from "@/components/mood-tiles";

export function HumorCard({
  value,
  registered,
  onChange,
}: {
  value: number | null;
  registered: boolean;
  onChange: (index: number) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">Como você está?</h2>
        {registered ? (
          <span className="text-xs font-bold text-lilac-deep">registrado ✓</span>
        ) : null}
      </div>
      <MoodTiles value={value} onChange={onChange} />
    </section>
  );
}
