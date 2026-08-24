import { describe, expect, it } from "bun:test";

import { onboardingPayload, portionHint, workoutDaysHint, type OnboardingState } from "./format";

const state = (over: Partial<OnboardingState> = {}): OnboardingState => ({
  step: 1,
  waterMl: 2000,
  portionMl: 500,
  meals: 3,
  workoutDays: new Set(),
  ...over,
});

describe("portionHint", () => {
  it("divide a meta pela porção", () => {
    expect(portionHint(2000, 500)).toBe("≈ 4 porções por dia");
    expect(portionHint(2000, 250)).toBe("≈ 8 porções por dia");
  });
  it("usa o singular quando a meta cabe numa porção", () => {
    expect(portionHint(500, 500)).toBe("≈ 1 porção por dia");
  });
});

describe("workoutDaysHint", () => {
  it("anuncia o default quando nada foi escolhido", () => {
    expect(workoutDaysHint(0)).toBe("Sem dias escolhidos — vamos usar 4 dias por semana");
  });
  it("concorda em número", () => {
    expect(workoutDaysHint(1)).toBe("1 dia por semana");
    expect(workoutDaysHint(5)).toBe("5 dias por semana");
  });
});

describe("onboardingPayload", () => {
  it("manda a contagem de dias marcados", () => {
    const payload = onboardingPayload(state({ workoutDays: new Set([0, 1, 3, 4, 5]) }));
    expect(payload).toEqual({ waterMl: 2000, portionMl: 500, meals: 3, workoutDays: 5 });
  });
  it("nenhum dia marcado cai no default, nunca em zero", () => {
    expect(onboardingPayload(state()).workoutDays).toBe(4);
  });
  it("carrega os valores escolhidos nos outros passos", () => {
    const payload = onboardingPayload(state({ waterMl: 3000, portionMl: 250, meals: 5 }));
    expect(payload.waterMl).toBe(3000);
    expect(payload.portionMl).toBe(250);
    expect(payload.meals).toBe(5);
  });
});
