import { dayFor, previousDay } from "@/server/shared/day";

/** Treino em andamento sem série concluída por esse tempo: provavelmente esqueceram de concluir. */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

/** Última vez que a pessoa mexeu no treino: o início ou a série concluída mais recente. */
export function lastActivityAt(startedAt: Date, doneAts: (Date | null)[]): Date {
  return doneAts.reduce<Date>((last, d) => (d && d > last ? d : last), startedAt);
}

export function isStale(lastActivity: Date, now: Date): boolean {
  return now.getTime() - lastActivity.getTime() >= STALE_AFTER_MS;
}

const TIME_FMT = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/Sao_Paulo",
});

/** Textos da escolha "concluir na última série": o horário sozinho é ambíguo num treino de outro dia. */
export function staleChoiceCopy(last: Date, now: Date): { title: string; endLabel: string; body: string } {
  const time = TIME_FMT.format(last);
  const day = dayFor(last);
  const tail = "Concluir nesse horário deixa a duração do treino sem as horas paradas.";
  if (day === dayFor(now)) {
    return {
      title: `Treino parado desde ${time}`,
      endLabel: `Concluir às ${time}`,
      body: `Nenhuma série foi concluída depois das ${time}. ${tail}`,
    };
  }
  const yesterday = day === previousDay(dayFor(now));
  const dayLabel = yesterday ? "ontem" : `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;
  return {
    title: `Treino parado desde ${dayLabel}, ${time}`,
    endLabel: `Concluir ${yesterday ? "ontem" : `em ${dayLabel}`} às ${time}`,
    body: `Nenhuma série foi concluída depois de ${dayLabel} às ${time}. ${tail}`,
  };
}
