"use client";

import { useEffect, useState } from "react";

export function DiarioCard({
  note,
  onSave,
}: {
  note: string | null;
  onSave: (note: string) => void;
}) {
  const [text, setText] = useState<string>(note ?? "");

  useEffect(() => {
    setText(note ?? "");
  }, [note]);

  const trimmed = text.trim();
  const disabled = trimmed === "" || trimmed === (note ?? "");

  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">Mini-diário</h2>
      <div className="rounded-card bg-pink-tint p-4">
        <p className="mb-3 text-sm font-semibold text-[#9a8290]">
          Quer escrever o que passou pela sua cabeça? Fica só entre vocês dois.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva o que vier..."
          maxLength={2000}
          className="min-h-13 w-full resize-none rounded-control bg-white px-3.5 py-3 text-sm text-ink placeholder:text-[#c6b6c0] focus:outline-none focus:ring-2 focus:ring-lilac"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(trimmed)}
          className="mt-3 w-full rounded-control bg-pink-bright py-2.5 font-display text-sm font-bold text-white disabled:opacity-50"
        >
          Salvar registro
        </button>
      </div>
    </section>
  );
}
