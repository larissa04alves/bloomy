"use client";

import { cn } from "@bloomy/ui/lib/utils";

export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6.75 w-11.5 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none",
        checked ? "bg-lilac" : "bg-control-off",
      )}
    >
      <span
        className={cn(
          "absolute top-0.75 size-5.25 rounded-full bg-white shadow-card-sm transition-[left] duration-200 motion-reduce:transition-none",
          checked ? "left-5.55" : "left-0.75",
        )}
      />
    </button>
  );
}
