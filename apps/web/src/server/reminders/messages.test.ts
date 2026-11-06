import { describe, expect, test } from "bun:test";

import { notificationFor } from "./messages";
import type { DueSlot } from "./slots";

const slot = (over: Partial<DueSlot>): DueSlot => ({
  reminderId: "r",
  type: "pill",
  day: "2026-07-06",
  slot: "21:00",
  refId: "",
  action: "send",
  ...over,
});

describe("lembretes do ciclo", () => {
  test("pílula usa o rótulo do comprimido e abre o Ciclo", () => {
    expect(notificationFor(slot({ type: "pill", label: "comprimido 15 de 21" }))).toMatchObject({
      title: "Hora da pílula",
      body: "comprimido 15 de 21",
      url: "/ciclo",
    });
  });

  test("ciclo chegando fala de menstruação no modo natural", () => {
    expect(notificationFor(slot({ type: "cycle_soon", soonKind: "period" }))).toMatchObject({
      title: "Sua menstruação deve vir em ~2 dias",
      url: "/ciclo",
    });
  });

  test("ciclo chegando fala de pausa em método com cartela", () => {
    expect(notificationFor(slot({ type: "cycle_soon", soonKind: "pause" }))).toMatchObject({
      title: "Sua pausa começa em 2 dias",
      url: "/ciclo",
    });
  });

  test("ainda menstruada pede o registro de hoje", () => {
    expect(notificationFor(slot({ type: "period_check" }))).toMatchObject({
      title: "Ainda menstruada?",
      body: "Registre como está hoje",
      url: "/ciclo",
    });
  });
});
