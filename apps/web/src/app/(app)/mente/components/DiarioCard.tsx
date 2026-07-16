"use client";

import { useState } from "react";

export function DiarioCard({
  onSave,
}: {
  onSave: (note: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const trimmed = text.trim();

  async function handleSave() {
    if (saving || trimmed === "") return;
    setSaving(true);
    try {
      const ok = await onSave(trimmed);
      if (ok) setText(""); // limpa pra escrever outro relato; preserva no erro
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">
        Mini-diário
      </h2>
      <div className="rounded-card bg-pink-tint p-4">
        <p className="mb-3 text-sm font-semibold text-[#9a8290]">
          Quer escrever o que passou pela sua cabeça?
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Escreva um relato no mini-diário"
          placeholder="Escreva o que vier..."
          maxLength={2000}
          className="min-h-13 w-full resize-none rounded-control bg-white px-3.5 py-3 text-sm text-ink placeholder:text-[#c6b6c0] focus:outline-none focus:ring-2 focus:ring-lilac"
        />
        <button
          type="button"
          disabled={trimmed === "" || saving}
          onClick={handleSave}
          className="mt-3 w-full rounded-control bg-pink-bright py-2.5 font-display text-sm font-bold text-white disabled:opacity-50"
        >
          Salvar registro
        </button>
      </div>
    </section>
  );
}
