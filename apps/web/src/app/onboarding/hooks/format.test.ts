import { describe, expect, it } from "bun:test";

import {
  applyBodyStep,
  bodyErrors,
  finishHref,
  visibleErrors,
  skipBodyStep,
  nextStep,
  onboardingPayload,
  skipTarget,
  workoutDaysHint,
  type OnboardingState,
} from "./format";

const state = (over: Partial<OnboardingState> = {}): OnboardingState => ({
  step: 1,
  heightRaw: "",
  weightRaw: "",
  birthRaw: "",
  recommendedMl: null,
  waterMl: 2000,
  portionMl: 500,
  meals: 3,
  workoutDays: new Set(),
  cycleIntent: false,
  ...over,
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

describe("nextStep", () => {
  it("avança passo a passo até as metas acabarem", () => {
    expect(nextStep(1, false)).toBe(2);
    expect(nextStep(2, true)).toBe(3);
    expect(nextStep(3, false)).toBe(4);
  });
  it("depois das metas vem o passo do ciclo, com ou sem permissão a pedir", () => {
    expect(nextStep(4, true)).toBe(5);
    expect(nextStep(4, false)).toBe(5);
  });
  it("depois do ciclo vai para os lembretes quando a permissão ainda não foi pedida", () => {
    expect(nextStep(5, true)).toBe(6);
  });
  it("termina depois do ciclo quando não há permissão a pedir", () => {
    expect(nextStep(5, false)).toBe("finish");
  });
  it("o passo de lembretes é o último", () => {
    expect(nextStep(6, true)).toBe("finish");
  });
});

describe("skipTarget", () => {
  it("pular o 'Sobre você' vai só para a água", () => {
    expect(skipTarget(1, true)).toBe(2);
    expect(skipTarget(1, false)).toBe(2);
  });
  it("pular as metas cai no passo do ciclo", () => {
    expect(skipTarget(2, true)).toBe(5);
    expect(skipTarget(4, true)).toBe(5);
    expect(skipTarget(3, false)).toBe(5);
  });
  it("pular o ciclo segue para os lembretes, ou termina sem permissão a pedir", () => {
    expect(skipTarget(5, true)).toBe(6);
    expect(skipTarget(5, false)).toBe("finish");
  });
  it("pular o próprio passo de lembretes termina", () => {
    expect(skipTarget(6, true)).toBe("finish");
  });
});

describe("finishHref", () => {
  it("com 'Ativar' escolhido no passo do ciclo, termina na ativação do ciclo", () => {
    expect(finishHref(state({ step: 5, cycleIntent: true }))).toBe("/ciclo/ativar");
  });
  it("sem a intenção, termina na Hoje", () => {
    expect(finishHref(state({ step: 6 }))).toBe("/home");
  });
});

describe("applyBodyStep", () => {
  it("com peso, a água nasce na meta recomendada", () => {
    const next = applyBodyStep(state({ weightRaw: "62,5" }));
    expect(next.recommendedMl).toBe(2200);
    expect(next.waterMl).toBe(2200);
  });
  it("voltar sem mudar o peso preserva a meta ajustada à mão", () => {
    const next = applyBodyStep(state({ weightRaw: "62", recommendedMl: 2200, waterMl: 2500 }));
    expect(next.waterMl).toBe(2500);
  });
  it("trocar o peso recalcula e sobrescreve o ajuste", () => {
    const next = applyBodyStep(state({ weightRaw: "70", recommendedMl: 2200, waterMl: 2500 }));
    expect(next.recommendedMl).toBe(2500);
    expect(next.waterMl).toBe(2500);
  });
  it("apagar o peso desfaz a meta que só existia por causa dele", () => {
    const next = applyBodyStep(state({ weightRaw: "", recommendedMl: 2200, waterMl: 2200 }));
    expect(next.recommendedMl).toBeNull();
    expect(next.waterMl).toBe(2000);
  });
  it("sem peso, sem recomendação e a meta fica como está", () => {
    const next = applyBodyStep(state({ weightRaw: "", recommendedMl: 2200, waterMl: 2500 }));
    expect(next.recommendedMl).toBeNull();
    expect(next.waterMl).toBe(2500);
  });
});

describe("bodyErrors", () => {
  it("campos vazios não são erro", () => {
    expect(bodyErrors(state())).toEqual({});
  });
  it("aponta o campo preenchido fora da faixa", () => {
    expect(bodyErrors(state({ heightRaw: "99" }))).toEqual({ height: "Altura entre 100 e 250 cm" });
    expect(bodyErrors(state({ weightRaw: "19" }))).toEqual({ weight: "Peso entre 20 e 300 kg" });
    expect(bodyErrors(state({ weightRaw: "abc" }))).toEqual({ weight: "Peso entre 20 e 300 kg" });
    expect(bodyErrors(state({ birthRaw: "31/12/1899" }), "2026-11-04")).toEqual({
      birthDate: "Data de nascimento inválida",
    });
    expect(bodyErrors(state({ birthRaw: "05/11/2026" }), "2026-11-04")).toEqual({
      birthDate: "Data de nascimento inválida",
    });
    expect(bodyErrors(state({ birthRaw: "14/03" }), "2026-11-04")).toEqual({
      birthDate: "Data de nascimento inválida",
    });
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
  it("leva os dados do corpo, com o peso em gramas", () => {
    const payload = onboardingPayload(
      state({ weightRaw: "62,5", heightRaw: "165", birthRaw: "14/03/1995" }),
    );
    expect(payload).toMatchObject({ weightGrams: 62_500, heightCm: 165, birthDate: "1995-03-14" });
  });
  it("campos vazios não viajam no corpo", () => {
    const payload = onboardingPayload(state());
    expect("weightGrams" in payload).toBe(false);
    expect("heightCm" in payload).toBe(false);
    expect("birthDate" in payload).toBe(false);
  });
});

describe("visibleErrors", () => {
  const errors = { height: "Altura entre 100 e 250 cm", weight: "Peso entre 20 e 300 kg" };
  it("não mostra erro de campo que a pessoa ainda está digitando", () => {
    expect(visibleErrors(errors, new Set())).toEqual({});
  });
  it("mostra só os campos que já perderam o foco", () => {
    expect(visibleErrors(errors, new Set(["height"]))).toEqual({ height: "Altura entre 100 e 250 cm" });
  });
});

describe("skipBodyStep", () => {
  it("pular descarta o que foi digitado e a meta derivada do peso", () => {
    const next = skipBodyStep(
      state({ heightRaw: "165", weightRaw: "62", birthRaw: "14/03/1995", recommendedMl: 2200, waterMl: 2200 }),
    );
    expect(next).toMatchObject({ heightRaw: "", weightRaw: "", birthRaw: "", recommendedMl: null, waterMl: 2000 });
    const payload = onboardingPayload(next);
    expect("weightGrams" in payload).toBe(false);
    expect(payload.waterMl).toBe(2000);
  });
  it("meta ajustada à mão sobrevive ao pular", () => {
    const next = skipBodyStep(state({ weightRaw: "62", recommendedMl: 2200, waterMl: 2600 }));
    expect(next.waterMl).toBe(2600);
  });
});
