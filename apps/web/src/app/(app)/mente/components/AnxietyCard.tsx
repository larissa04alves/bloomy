"use client";

import { useEffect, useState } from "react";

export function AnxietyCard({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (n: number) => void;
}) {
  // Sem valor salvo → knob no meio (50), mas só persiste após interação.
  const [local, setLocal] = useState<number>(value ?? 50);

  // Reconcilia quando o valor do servidor chega/muda (0 é válido → usar ??).
  useEffect(() => {
    setLocal(value ?? 50);
  }, [value]);

  return (
    <section className="rounded-card bg-white p-4.5 shadow-card">
      <h2 className="mb-4 font-display text-base font-bold text-ink">
        E a ansiedade hoje?
      </h2>
      <div className="relative mx-1.5 mb-2.5 h-2">
        <div
          className="h-2 rounded-full"
          style={{ background: "linear-gradient(90deg,#a8d5ba,#f3b6d0)" }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-5.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-lilac bg-white"
          style={{
            left: `${local}%`,
            boxShadow: "0 3px 8px rgba(120,86,164,.25)",
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={local}
          aria-label="Nível de ansiedade, de tranquilo a agitado"
          onChange={(e) => setLocal(Number(e.target.value))}
          onPointerUp={() => onCommit(local)}
          onKeyUp={() => onCommit(local)}
          className="absolute inset-0 h-6 w-full -translate-y-2 cursor-pointer opacity-0"
        />
      </div>
      <div className="flex justify-between text-xs font-semibold text-ink-read">
        <span>Tranquilo</span>
        <span>Agitado</span>
      </div>
    </section>
  );
}
