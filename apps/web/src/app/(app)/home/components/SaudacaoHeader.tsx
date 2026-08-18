import type { DayPeriod } from "@/lib/api-types";

import { dateLabel, greetingLabel } from "../hooks/format";
import { PerfilMenu } from "./PerfilMenu";

export function SaudacaoHeader({
  period,
  name,
  day,
}: {
  period: DayPeriod;
  name: string | null;
  day: string;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {greetingLabel(period, name)}
        </h1>
        <p className="mt-0.5 text-sm font-semibold text-ink-soft">{dateLabel(day)}</p>
      </div>
      <PerfilMenu name={name} />
    </header>
  );
}
