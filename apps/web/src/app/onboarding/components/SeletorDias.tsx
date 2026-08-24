"use client";

import { cn } from "@bloomy/ui/lib/utils";

/** Segunda→domingo. A inicial repete (S, T, Q, Q, S, S, D) — o `aria-label` desambigua. */
const DIAS = [
  { letra: "S", nome: "Segunda-feira" },
  { letra: "T", nome: "Terça-feira" },
  { letra: "Q", nome: "Quarta-feira" },
  { letra: "Q", nome: "Quinta-feira" },
  { letra: "S", nome: "Sexta-feira" },
  { letra: "S", nome: "Sábado" },
  { letra: "D", nome: "Domingo" },
];

/** Escolha visual dos dias. Só a contagem sai daqui: `goal.workout` guarda um número,
 *  e nenhuma tela do app consome dia-da-semana hoje (decisão 7 da spec). */
export function SeletorDias({
  selected,
  onToggle,
}: {
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {DIAS.map((dia, i) => (
        <button
          key={dia.nome}
          type="button"
          aria-label={dia.nome}
          aria-pressed={selected.has(i)}
          onClick={() => onToggle(i)}
          className={cn(
            "grid size-9 place-items-center rounded-full text-sm font-bold transition-colors",
            selected.has(i) ? "bg-pink-bright text-white" : "bg-pink-tint text-ink-faint",
          )}
        >
          {dia.letra}
        </button>
      ))}
    </div>
  );
}
