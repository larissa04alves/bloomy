import { cn } from "@bloomy/ui/lib/utils";

import { TONE, type Tone } from "@/lib/tone";

export function ProgressBar({
  value,
  tone = "lilac",
  track = "muted",
}: {
  value: number;
  tone?: Tone;
  /** Dentro de card tint o trilho é branco (protótipo); solto na tela, é o muted. */
  track?: "muted" | "white";
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-1.75 w-full overflow-hidden rounded-full",
        track === "white" ? "bg-white" : "bg-ring-track",
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none",
          TONE[tone].solid,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
