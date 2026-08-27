import { describe, expect, it } from "bun:test";

import { MEDS_BLOCKED_REASON, reminderSubtitle } from "./format";

const withMeds = { time: null, hasMedication: true };

describe("reminderSubtitle", () => {
  it("água anuncia o intervalo e a janela constantes", () => {
    expect(reminderSubtitle("water", withMeds)).toBe("A cada 3h, das 6h às 21h");
  });

  it("remédios apontam para o cadastro quando não há nenhum ativo", () => {
    expect(reminderSubtitle("meds", { time: null, hasMedication: false })).toBe(
      MEDS_BLOCKED_REASON,
    );
  });

  it("remédios seguem os horários cadastrados quando há remédio ativo", () => {
    expect(reminderSubtitle("meds", withMeds)).toBe("Nos horários dos seus remédios");
  });

  it("treino e mente mostram o horário escolhido", () => {
    expect(reminderSubtitle("workout", { time: "07:30", hasMedication: true })).toBe(
      "Todo dia às 07:30",
    );
    expect(reminderSubtitle("mind", { time: "22:00", hasMedication: true })).toBe(
      "Todo dia às 22:00",
    );
  });

  it("treino e mente caem no default quando a linha ainda não tem horário", () => {
    expect(reminderSubtitle("workout", withMeds)).toBe("Todo dia às 18:00");
    expect(reminderSubtitle("mind", withMeds)).toBe("Todo dia às 21:00");
  });

  it("consultas descrevem os dois avisos", () => {
    expect(reminderSubtitle("appointments", withMeds)).toBe("1 dia antes e 1 hora antes");
  });
});
