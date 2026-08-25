import { describe, expect, it, test } from "bun:test";

import {
  DEFAULT_TIME,
  deliveryKey,
  dueSlotsAt,
  timeFor,
  toTime,
  waterSlots,
  type ReminderRow,
  type UserState,
} from "./slots";

const R = {
  water: { id: "r-water", type: "water", time: null, enabled: true },
  meds: { id: "r-meds", type: "meds", time: null, enabled: true },
  workout: { id: "r-workout", type: "workout", time: DEFAULT_TIME.workout, enabled: true },
  mind: { id: "r-mind", type: "mind", time: DEFAULT_TIME.mind, enabled: true },
  appointments: { id: "r-appt", type: "appointments", time: null, enabled: true },
} satisfies Record<string, ReminderRow>;

function state(over: Partial<UserState> = {}): UserState {
  return {
    reminders: Object.values(R),
    water: { totalMl: 0, goalMl: 2000 },
    meds: [],
    workout: { hasActive: true, doneToday: false },
    mind: { checkedInToday: false },
    events: [],
    delivered: new Set(),
    ...over,
  };
}

/** SP é UTC-3: 09:00 local = 12:00Z. */
const at = (utc: string) => new Date(utc);

describe("timeFor (America/Sao_Paulo)", () => {
  test("meio-dia UTC vira 09:00 em SP", () => {
    expect(timeFor(at("2026-07-06T12:00:00Z"))).toBe("09:00");
  });
  test("meia-noite local é 00:00, não 24:00", () => {
    expect(timeFor(at("2026-07-06T03:00:00Z"))).toBe("00:00");
  });
  test("02:59Z ainda é 23:59 do dia anterior", () => {
    expect(timeFor(at("2026-07-06T02:59:00Z"))).toBe("23:59");
  });
});

describe("waterSlots", () => {
  it("cobre 06:00→21:00 de 3 em 3 horas", () => {
    expect(waterSlots()).toEqual(["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]);
  });
  it("não passa do fim da janela", () => {
    expect(waterSlots().at(-1)).toBe("21:00");
  });
});

describe("toTime", () => {
  it("formata com zero à esquerda", () => {
    expect(toTime(360)).toBe("06:00");
    expect(toTime(545)).toBe("09:05");
  });
});

describe("água", () => {
  test("slot das 09:00 sai em ponto", () => {
    const due = dueSlotsAt(at("2026-07-06T12:00:00Z"), state());
    expect(due.filter((d) => d.type === "water").map((d) => d.slot)).toEqual(["09:00"]);
  });

  test("meta batida no dia silencia todos os slots", () => {
    const due = dueSlotsAt(
      at("2026-07-06T12:00:00Z"),
      state({ water: { totalMl: 2000, goalMl: 2000 } }),
    );
    expect(due.some((d) => d.type === "water")).toBe(false);
  });

  test("22:00 local está fora da janela", () => {
    // 22:00 em SP = 01:00Z do dia seguinte; o último slot (21:00) já passou 60min.
    const due = dueSlotsAt(at("2026-07-07T01:00:00Z"), state());
    expect(due.filter((d) => d.type === "water" && d.action === "send")).toEqual([]);
  });

  test("06:00 é a borda de baixo e dispara", () => {
    const due = dueSlotsAt(at("2026-07-06T09:00:00Z"), state());
    expect(due.filter((d) => d.type === "water").map((d) => d.slot)).toEqual(["06:00"]);
  });
});

describe("tolerância de atraso", () => {
  test("29 minutos atrasado ainda envia", () => {
    const due = dueSlotsAt(at("2026-07-06T12:29:00Z"), state());
    const water = due.find((d) => d.type === "water" && d.slot === "09:00");
    expect(water?.action).toBe("send");
  });

  test("31 minutos atrasado vira missed", () => {
    const due = dueSlotsAt(at("2026-07-06T12:31:00Z"), state());
    const water = due.find((d) => d.type === "water" && d.slot === "09:00");
    expect(water?.action).toBe("miss");
  });

  test("um minuto antes do horário não sai nada", () => {
    const due = dueSlotsAt(at("2026-07-06T11:59:00Z"), state());
    expect(due.some((d) => d.slot === "09:00")).toBe(false);
  });

  test("atraso além da janela de registro some de vez", () => {
    // 09:00 + 2h01 = 11:01 local (14:01Z) — passou dos 120min de MISS_WINDOW.
    const due = dueSlotsAt(at("2026-07-06T14:01:00Z"), state());
    expect(due.some((d) => d.slot === "09:00")).toBe(false);
  });
});

describe("idempotência", () => {
  test("slot já entregue não reaparece", () => {
    const delivered = new Set([deliveryKey(R.water.id, "2026-07-06", "09:00", "")]);
    const due = dueSlotsAt(at("2026-07-06T12:00:00Z"), state({ delivered }));
    expect(due.some((d) => d.slot === "09:00")).toBe(false);
  });

  test("entrega de outro dia não bloqueia o slot de hoje", () => {
    const delivered = new Set([deliveryKey(R.water.id, "2026-07-05", "09:00", "")]);
    const due = dueSlotsAt(at("2026-07-06T12:00:00Z"), state({ delivered }));
    expect(due.some((d) => d.slot === "09:00")).toBe(true);
  });
});

describe("remédios", () => {
  test("três medicações às 08:00 viram um slot com count 3", () => {
    const due = dueSlotsAt(
      at("2026-07-06T11:00:00Z"), // 08:00 local
      state({ meds: [{ time: "08:00", pending: 3 }] }),
    );
    const meds = due.filter((d) => d.type === "meds");
    expect(meds).toHaveLength(1);
    expect(meds[0].count).toBe(3);
  });

  test("horário sem pendência não lembra", () => {
    const due = dueSlotsAt(
      at("2026-07-06T11:00:00Z"),
      state({ meds: [{ time: "08:00", pending: 0 }] }),
    );
    expect(due.some((d) => d.type === "meds")).toBe(false);
  });

  test("horários distintos geram slots distintos", () => {
    const due = dueSlotsAt(
      at("2026-07-06T11:10:00Z"), // 08:10 local
      state({ meds: [{ time: "08:00", pending: 1 }, { time: "08:05", pending: 2 }] }),
    );
    expect(due.filter((d) => d.type === "meds").map((d) => d.slot)).toEqual(["08:00", "08:05"]);
  });
});

describe("treino", () => {
  const at18 = at("2026-07-06T21:00:00Z"); // 18:00 local

  test("dispara no horário configurado", () => {
    expect(dueSlotsAt(at18, state()).some((d) => d.type === "workout")).toBe(true);
  });

  test("sem treino ativo cadastrado, não lembra", () => {
    const s = state({ workout: { hasActive: false, doneToday: false } });
    expect(dueSlotsAt(at18, s).some((d) => d.type === "workout")).toBe(false);
  });

  test("já treinou hoje, não lembra", () => {
    const s = state({ workout: { hasActive: true, doneToday: true } });
    expect(dueSlotsAt(at18, s).some((d) => d.type === "workout")).toBe(false);
  });

  test("horário customizado é respeitado", () => {
    const s = state({
      reminders: [{ ...R.workout, time: "07:30" }],
    });
    const due = dueSlotsAt(at("2026-07-06T10:30:00Z"), s); // 07:30 local
    expect(due.map((d) => d.slot)).toEqual(["07:30"]);
  });
});

describe("mente", () => {
  const at21 = at("2026-07-07T00:00:00Z"); // 21:00 local do dia 06

  test("dispara às 21:00", () => {
    expect(dueSlotsAt(at21, state()).some((d) => d.type === "mind")).toBe(true);
  });

  test("check-in feito silencia", () => {
    const s = state({ mind: { checkedInToday: true } });
    expect(dueSlotsAt(at21, s).some((d) => d.type === "mind")).toBe(false);
  });
});

describe("consultas e exames", () => {
  // Só o lembrete de consultas: com todos ligados, os slots de água nos mesmos
  // horários entrariam no resultado e o teste deixaria de falar sobre consultas.
  const only = (over: Partial<UserState> = {}) =>
    state({ reminders: [R.appointments], ...over });

  const consulta = {
    kind: "appt" as const,
    id: "a1",
    scheduledAt: at("2026-07-07T17:00:00Z"), // 07/07 14:00 local
    remindDayBefore: true,
    label: "Dra. Ana",
  };

  test("véspera avisa no mesmo horário do compromisso", () => {
    // 06/07 14:00 local = 17:00Z
    const due = dueSlotsAt(at("2026-07-06T17:00:00Z"), only({ events: [consulta] }));
    expect(due.map((d) => ({ slot: d.slot, refId: d.refId }))).toEqual([
      { slot: "14:00", refId: "appt:a1:1d" },
    ]);
  });

  test("consulta sem remindDayBefore não avisa na véspera", () => {
    const s = only({ events: [{ ...consulta, remindDayBefore: false }] });
    expect(dueSlotsAt(at("2026-07-06T17:00:00Z"), s)).toEqual([]);
  });

  test("exame avisa na véspera mesmo sem flag", () => {
    const s = only({
      events: [{ ...consulta, kind: "exam", id: "e1", remindDayBefore: false }],
    });
    const due = dueSlotsAt(at("2026-07-06T17:00:00Z"), s);
    expect(due.map((d) => d.refId)).toEqual(["exam:e1:1d"]);
  });

  test("aviso de 1h antes sai no dia do compromisso", () => {
    // 07/07 13:00 local = 16:00Z
    const due = dueSlotsAt(at("2026-07-07T16:00:00Z"), only({ events: [consulta] }));
    expect(due.map((d) => ({ slot: d.slot, refId: d.refId, label: d.label }))).toEqual([
      { slot: "13:00", refId: "appt:a1:1h", label: "Dra. Ana" },
    ]);
  });

  test("duas consultas no mesmo horário geram slots separados", () => {
    const outra = { ...consulta, id: "a2", label: "Dr. Bruno" };
    const due = dueSlotsAt(
      at("2026-07-07T16:00:00Z"),
      only({ events: [consulta, outra] }),
    );
    expect(due.map((d) => d.refId).sort()).toEqual(["appt:a1:1h", "appt:a2:1h"]);
  });

  test("toggle desligado derruba consulta com flag marcada", () => {
    const s = state({
      reminders: [{ ...R.appointments, enabled: false }],
      events: [consulta],
    });
    expect(dueSlotsAt(at("2026-07-06T17:00:00Z"), s)).toEqual([]);
  });

  test("compromisso antes das 01:00 não gera aviso de 1h antes", () => {
    const madrugada = { ...consulta, scheduledAt: at("2026-07-07T03:30:00Z") }; // 00:30 local
    const due = dueSlotsAt(at("2026-07-07T03:30:00Z"), only({ events: [madrugada] }));
    expect(due.some((d) => d.refId.endsWith(":1h"))).toBe(false);
  });
});

describe("toggle desligado", () => {
  test("lembrete com enabled false nunca sai", () => {
    const s = state({ reminders: [{ ...R.water, enabled: false }] });
    expect(dueSlotsAt(at("2026-07-06T12:00:00Z"), s)).toEqual([]);
  });
});
