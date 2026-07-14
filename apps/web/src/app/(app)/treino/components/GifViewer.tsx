"use client";

import { BarbellIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import type { CatalogExercise } from "@/lib/api-types";
import { FOCUS_LABELS } from "@/lib/api-types";

import { gifUrl } from "../hooks/gif";

/**
 * `secondaryMuscles` vêm crus em EN da API — sem mapa PT ainda (fora do escopo
 * desta task), então mostramos só o chip do grupo (PT garantido via FOCUS_LABELS).
 *
 * Renderizado inline (sem portal): dentro do BottomSheet do vaul, um portal pro
 * body faria o clique de fechar contar como "clique-fora" e o vaul fecharia o
 * sheet junto. Inline, o vaul ignora — fechar só fecha o ver-grande.
 */
export function GifViewer({
  exercise,
  onClose,
}: {
  exercise: CatalogExercise;
  onClose: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move o foco para "Fechar" ao abrir, aceita Escape e restaura o foco anterior.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 px-4 pb-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-105 rounded-card-lg bg-white p-4 pb-6 shadow-sheet"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="ml-auto grid size-9 place-items-center rounded-full bg-lilac-tint-soft text-ink-read"
        >
          <XIcon size={16} weight="bold" />
        </button>
        {broken ? (
          <div className="mt-1 grid aspect-square w-full place-items-center rounded-card bg-pink-tint">
            <BarbellIcon size={64} weight="fill" className="text-pink-deep" />
          </div>
        ) : (
          <img
            src={gifUrl(exercise.id)}
            alt={exercise.namePt}
            onError={() => setBroken(true)}
            className="mt-1 aspect-square w-full rounded-card object-cover"
          />
        )}
        <h2 id={titleId} className="mt-4 font-display text-xl font-bold text-ink">{exercise.namePt}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-pink-tint px-3 py-1 text-xs font-bold text-pink-deep">
            {FOCUS_LABELS[exercise.group]}
          </span>
        </div>
        <p className="mt-3 text-right text-xs text-ink-faint">© Gym Visual</p>
      </div>
    </div>
  );
}
