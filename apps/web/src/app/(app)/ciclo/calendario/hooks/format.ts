import type { CycleHistory, CycleHistorySection, DayEntry, DayRange } from "@/lib/api-types";
import { type CycleMethodKind, METHOD_LABELS } from "@/lib/cycle";
import { addDays, daysBetween } from "@/server/shared/day";

import { dayMonth, plural, rangeParts } from "../../hooks/format";

export type GridMark = "period" | "spotting" | "predicted" | null;
export type GridCell = {
  day: string;
  date: number;
  mark: GridMark;
  symptom: boolean;
  today: boolean;
  future: boolean;
} | null;

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function monthLabel(month: string): string {
  return `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

export function shiftMonth(month: string, delta: number): string {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthBounds(month: string): DayRange {
  const from = `${month}-01`;
  return { from, to: addDays(`${shiftMonth(month, 1)}-01`, -1) };
}

const MARK_LABELS: Record<"natural" | "hormonal", Record<NonNullable<GridMark>, string>> = {
  natural: { period: "menstruação", spotting: "escape", predicted: "menstruação prevista" },
  hormonal: { period: "sangramento", spotting: "escape", predicted: "pausa prevista" },
};

export function dayAriaLabel(cell: NonNullable<GridCell>, natural: boolean): string {
  return [
    `${cell.date} de ${MONTH_NAMES[Number(cell.day.slice(5, 7)) - 1]}`,
    cell.today && "hoje",
    cell.mark && MARK_LABELS[natural ? "natural" : "hormonal"][cell.mark],
    cell.symptom && "com sintoma",
  ]
    .filter(Boolean)
    .join(", ");
}

const BLEEDING = new Set<DayEntry["flow"]>(["light", "medium", "heavy"]);

export function monthGrid(month: string, days: DayEntry[], predicted: DayRange | null, today: string): GridCell[] {
  const { from, to } = monthBounds(month);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const leading = new Date(`${from}T00:00:00Z`).getUTCDay();
  const cells: GridCell[] = Array.from({ length: leading }, () => null);

  for (let day = from; day <= to; day = addDays(day, 1)) {
    const entry = byDay.get(day);
    let mark: GridMark = null;
    if (entry && BLEEDING.has(entry.flow)) mark = "period";
    else if (entry?.flow === "spotting") mark = "spotting";
    // Previsão em dia que já passou sem sangramento só confundiria: fica a partir de hoje.
    else if (predicted && day >= today && day >= predicted.from && day <= predicted.to) mark = "predicted";
    cells.push({
      day,
      date: Number(day.slice(8, 10)),
      mark,
      symptom: (entry?.symptoms.length ?? 0) > 0,
      today: day === today,
      future: day > today,
    });
  }
  return cells;
}

export type HistoryItem =
  | { kind: "row"; key: string; title: string; detail: string; bar: number | null }
  | { kind: "switch"; key: string; text: string };

const methodName = (kind: CycleMethodKind) =>
  kind === "none"
    ? "sem método"
    : kind === "hormonal_iud" || kind === "copper_iud"
      ? METHOD_LABELS[kind]
      : METHOD_LABELS[kind].toLowerCase();

const range = (r: DayRange) => {
  if (r.from === r.to) return dayMonth(r.from);
  const [a, b] = rangeParts(r);
  return `${a} a ${b}`;
};

function sectionRows(section: CycleHistorySection, today: string): HistoryItem[] {
  const key = (suffix: string) => `${section.kind}-${section.startedOn}-${suffix}`;
  const row = (suffix: string, title: string, detail: string, bar: number | null = null): HistoryItem => ({
    kind: "row",
    key: key(suffix),
    title,
    detail,
    bar,
  });

  if (section.mode === "natural") {
    return section.cycles.map((c) => {
      if (c.status === "current") return row(c.start, `${dayMonth(c.start)} → hoje`, `em andamento · dia ${c.length}`);
      const title = `${dayMonth(c.start)} → ${dayMonth(c.end)}`;
      const period = c.periodDays === null ? null : `${c.periodDays} de menstruação`;
      if (c.status === "cut") return row(c.start, title, ["até a troca de método", period].filter(Boolean).join(" · "));
      return row(
        c.start,
        title,
        [plural(c.length, "dia", "dias"), period].filter(Boolean).join(" · "),
        c.periodDays === null ? null : Math.round((c.periodDays / c.length) * 100),
      );
    });
  }

  if (section.mode === "scheduled") {
    return section.sequences.map((s) => {
      if (s.status === "current" && s.pause.from > today) {
        return row(s.start, `${dayMonth(s.start)} → hoje`, `em andamento · pausa prevista ${range(s.pause)}`);
      }
      if (s.status === "cut") {
        return row(s.start, `${dayMonth(s.start)} → ${dayMonth(addDays(section.endedOn!, -1))}`, "até a troca de método");
      }
      const ongoing = s.status === "current" && today <= s.pause.to;
      const bleed = !s.bleed
        ? ongoing
          ? null
          : "sem sangramento"
        : s.bleed.from === s.bleed.to
          ? `sangrou em ${dayMonth(s.bleed.from)}`
          : `sangrou ${range(s.bleed)}`;
      const detail = [`pausa ${range(s.pause)}`, ongoing && "em andamento", bleed].filter(Boolean).join(" · ");
      return row(s.start, `${dayMonth(s.start)} → ${dayMonth(s.pause.to)}`, detail);
    });
  }

  if (section.events.length === 0) {
    return [row("empty", "Nenhum sangramento registrado", `desde ${dayMonth(section.startedOn)}`)];
  }
  return section.events.map((e) =>
    row(e.from, range(e), `${plural(daysBetween(e.from, e.to) + 1, "dia", "dias")} de sangramento`),
  );
}

export function historyItems(history: CycleHistory, today: string): HistoryItem[] {
  return history.sections.flatMap((section, i) => {
    const rows = sectionRows(section, today);
    const older = history.sections[i + 1];
    if (!older) return rows;
    const since = section.kind === "none" ? "sem método" : `com ${methodName(section.kind)}`;
    const outside = section.mode === "natural" ? " (fora da média)" : "";
    return [
      ...rows,
      {
        kind: "switch" as const,
        key: `switch-${section.startedOn}`,
        text: `Desde ${dayMonth(section.startedOn)} ${since} · antes, ${methodName(older.kind)}${outside}`,
      },
    ];
  });
}
