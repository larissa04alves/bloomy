import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { TONE, type Tone } from "@/lib/tone";

const SIZE = {
  md: "size-8 rounded-[14px]",
  lg: "size-10 rounded-[18px]",
} as const;

export function IconChip({
  tone,
  icon,
  variant = "tint",
  size = "md",
  className,
}: {
  tone: Tone;
  icon: ReactNode;
  variant?: "tint" | "white";
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        SIZE[size],
        variant === "white" ? "bg-white" : t.tint,
        t.deep,
        className,
      )}
    >
      {icon}
    </span>
  );
}
