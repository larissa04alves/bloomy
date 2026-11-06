import type { CycleState } from "@/lib/api-types";
import {
  CYCLE_SYMPTOMS,
  type CycleFlow,
  type CycleMethodKind,
  METHOD_LABELS,
} from "@/lib/cycle";
import { addDays, daysBetween } from "@/server/shared/day";

type Position = NonNullable<CycleState["scheduled"]>;
type Natural = NonNullable<CycleState["natural"]>;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const parts = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return { date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()]!, weekday: WEEKDAYS[d.getUTCDay()]! };
};

export const dayMonth = (day: string) => `${parts(day).date}/${parts(day).month}`;

export function rangeParts({ from, to }: { from: string; to: string }): [string, string] {
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return [sameMonth ? String(parts(from).date) : dayMonth(from), dayMonth(to)];
}

export type PillDot = "taken" | "missed" | "current" | "left" | "pause-left";

/** Bolinhas da cartela; `current` é a posição de hoje (1-based). Antes de `startedOn` não há
 *  marcações para consultar, então esses dias contam como tomados. */
export function pillDots({
  length,
  current,
  today,
  startedOn,
  takenDays,
  takenToday,
}: {
  length: number;
  current: number;
  today: string;
  startedOn: string;
  takenDays: string[];
  takenToday: boolean;
}): PillDot[] {
  return Array.from({ length }, (_, i) => {
    if (i === current - 1) return takenToday ? "taken" : "current";
    if (i >= current) return "left";
    const day = addDays(today, i - (current - 1));
    return day < startedOn || takenDays.includes(day) ? "taken" : "missed";
  });
}

export function pauseDots(length: number, current: number): PillDot[] {
  return Array.from({ length }, (_, i) =>
    i < current - 1 ? "taken" : i === current - 1 ? "current" : "pause-left",
  );
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function windowLabel(range: { from: string; to: string }): string {
  const [a, b] = rangeParts(range);
  return `entre ${a} e ${b}`;
}

export function pillLabel(
  position: Position,
  kind: CycleMethodKind,
  activeDays: number,
): { title: string; detail: string } {
  if (kind === "pill") {
    return {
      title: `Cartela ${position.unit} de ${position.units}`,
      detail: `comprimido ${position.pill} de ${activeDays}`,
    };
  }
  return {
    title: `${kind === "ring" ? "Anel" : "Adesivo"} ${position.unit} de ${position.units}`,
    detail: `semana ${Math.ceil(position.pill / 7)} de 3`,
  };
}

const LONG_MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const LONG_WEEKDAYS = [
  "no domingo", "na segunda-feira", "na terça-feira", "na quarta-feira",
  "na quinta-feira", "na sexta-feira", "no sábado",
];

/** "na terça-feira, 10 de novembro" */
const longDate = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return `${LONG_WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${LONG_MONTHS[d.getUTCMonth()]}`;
};

const NEXT_UNIT: Partial<Record<CycleMethodKind, string>> = { ring: "Próximo anel", patch: "Próximo adesivo" };
const NEXT_UNIT_SENTENCE: Partial<Record<CycleMethodKind, string>> = {
  ring: "Seu próximo anel entra",
  patch: "Seu próximo adesivo entra",
};

export function pauseLabel(position: Position, kind: CycleMethodKind): { title: string; detail: string } {
  const { from, to } = position.nextPause;
  return {
    title: `Pausa · dia ${position.pauseDay ?? 1} de ${daysBetween(from, to) + 1}`,
    detail: `${NEXT_UNIT[kind] ?? "Próxima cartela"} ${longDate(addDays(to, 1))}`,
  };
}

export function startPauseEffect(today: string, pauseDays: number, kind: CycleMethodKind): string {
  const next = NEXT_UNIT_SENTENCE[kind] ?? "Sua próxima cartela começa";
  return `${next} ${longDate(addDays(today, pauseDays))}.`;
}

// Emendar durante a pausa interrompe a pausa: a unidade nova começa hoje (ver buildSequence em calc.ts).
export function extendEffect(position: Position, today: string, activeDays: number): string {
  const { from, to } = position.nextPause;
  const start = addDays(position.phase === "pause" ? today : from, activeDays);
  const [a, b] = rangeParts({ from: start, to: addDays(start, daysBetween(from, to)) });
  return `A pausa passa para ${a} a ${b}`;
}

export function nextPauseLabel(position: Position, today: string): string {
  const days = daysBetween(today, position.nextPause.from);
  const when =
    days <= 0
      ? "hoje"
      : days === 1
        ? "amanhã"
        : days < 14
          ? `em ${days} dias`
          : `em ~${Math.round(days / 7)} semanas`;
  const [a, b] = rangeParts(position.nextPause);
  return `Próxima pausa ${when} · ${a} a ${b}`;
}

export function lateLabel(days: number): string {
  return `Passou da previsão há ${plural(days, "dia", "dias")} · registre quando vier`;
}

export function showExtend(position: Position, today: string): boolean {
  return position.phase === "pause" || daysBetween(today, position.nextPause.from) <= 3;
}

const monthYear = (day: string) => `${MONTHS[Number(day.slice(5, 7)) - 1]}/${day.slice(0, 4)}`;

export function summaryLabel(state: CycleState): string {
  const { kind, pauseEvery, startedOn } = state.method;
  if (kind === "none") return "Sem método hormonal";
  if (state.mode === "scheduled" && pauseEvery) {
    if (kind === "pill") {
      return `Pílula · pausa a cada ${pauseEvery === 1 ? "cartela" : `${pauseEvery} cartelas`}`;
    }
    return `${METHOD_LABELS[kind]} · pausa a cada ${pauseEvery * 3} semanas`;
  }
  const name = kind === "pill" ? "Pílula contínua" : METHOD_LABELS[kind];
  return `${name} · desde ${monthYear(startedOn)}`;
}

export function calendarHint(state: CycleState): string {
  if (state.natural) return `ciclo médio ${state.natural.avgLength} dias`;
  if (state.continuous) {
    const n = state.continuous.eventsLast180;
    return n === 0
      ? "nenhum sangramento nos últimos 6 meses"
      : `${plural(n, "sangramento", "sangramentos")} nos últimos 6 meses`;
  }
  return "pausas e sangramentos registrados";
}

const FLOW_TITLES: Record<CycleFlow, string> = {
  none: "Sem sangramento",
  spotting: "Escape",
  light: "Fluxo leve",
  medium: "Fluxo médio",
  heavy: "Fluxo intenso",
};

export function flowTitle(flow: CycleFlow): string {
  return FLOW_TITLES[flow];
}

export function todayEntry(today: CycleState["today"]): { flow: string | null; symptoms: string[] } | null {
  if (!today.flow) return null;
  const symptoms = today.symptoms.map((id) => CYCLE_SYMPTOMS[id]);
  // O rascunho salva "só sintomas" como flow "none"; "Sem sangramento" só aparece no "Nada" sozinho.
  const flow = today.flow !== "none" ? flowTitle(today.flow) : symptoms.length ? null : flowTitle("none");
  return { flow, symptoms };
}

export function continuousLabel(state: CycleState): { title: string; detail: string; note: string } {
  const name = state.method.kind === "pill" ? "pílula contínua" : METHOD_LABELS[state.method.kind];
  const note = `Com ${name} o sangramento costuma ser irregular, então não fazemos previsão — só guardamos o que você registrar.`;
  const last = state.continuous?.lastBleed;
  const since = state.continuous?.daysSince;
  if (!last || since == null) {
    return { title: "Nenhum sangramento registrado", detail: "registre quando acontecer", note };
  }
  const what = last.flow === "spotting" ? "Último escape" : "Último sangramento";
  const when = since === 0 ? "hoje" : since === 1 ? "ontem" : `há ${since} dias`;
  return {
    title: `${what} ${when}`,
    detail: `${FLOW_TITLES[last.flow].toLowerCase()} em ${dayMonth(last.day)}`,
    note,
  };
}

export function registroTitle(day: string, today: string): string {
  const p = parts(day);
  const date = `${p.date}/${p.month}`;
  if (day === today) return `Hoje, ${p.weekday} ${date}`;
  if (addDays(day, 1) === today) return `Ontem, ${p.weekday} ${date}`;
  return `${p.weekday}, ${date}`;
}

const DEFAULT_PERIOD_DAYS = 5;

// Porcentagens do anel (conic-gradient): menstruação no começo, faixa prevista no fim.
// O anel vai até 1 dia depois da faixa para ela não encostar no começo.
export function ringStops(natural: Natural, today: string): { period: number; from: number; to: number } {
  const start = addDays(today, -(natural.cycleDay - 1));
  const total = daysBetween(start, natural.window.to) + 2;
  const pct = (days: number) => Math.round((days / total) * 1000) / 10;
  return {
    period: pct(natural.avgPeriodLength ?? DEFAULT_PERIOD_DAYS),
    from: pct(daysBetween(start, natural.window.from)),
    to: pct(daysBetween(start, natural.window.to) + 1),
  };
}
