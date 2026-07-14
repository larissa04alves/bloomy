import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { TONE, type Tone } from "@/lib/tone";

export function ChoiceChip({
  tone = "lilac",
  selected,
  onClick,
  children,
}: {
  tone?: Tone;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "min-h-9 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        selected ? cn(t.solid, "text-white") : cn("bg-lilac-tint-soft", t.deep),
      )}
    >
      {children}
    </button>
  );
}
