import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { TONE, type Tone } from "@/lib/tone";

export function IconChip({
  tone,
  icon,
  variant = "tint",
  className,
}: {
  tone: Tone;
  icon: ReactNode;
  variant?: "tint" | "white";
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "grid size-10.5 shrink-0 place-items-center rounded-[14px]",
        variant === "white" ? "bg-white" : t.tint,
        t.deep,
        className,
      )}
    >
      {icon}
    </span>
  );
}
