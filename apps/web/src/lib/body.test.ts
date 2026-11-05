import { describe, expect, it } from "bun:test";

import { maskBirthDate, parseBrDate } from "./body";

describe("maskBirthDate", () => {
  it("monta dd/mm/aaaa enquanto digita", () => {
    expect(maskBirthDate("14")).toBe("14");
    expect(maskBirthDate("1403")).toBe("14/03");
    expect(maskBirthDate("14031995")).toBe("14/03/1995");
  });
  it("ignora o que não é dígito e corta o excesso", () => {
    expect(maskBirthDate("14/03/19")).toBe("14/03/19");
    expect(maskBirthDate("140319951")).toBe("14/03/1995");
  });
});

describe("parseBrDate", () => {
  it("converte dd/mm/aaaa para AAAA-MM-DD", () => {
    expect(parseBrDate("14/03/1995")).toBe("1995-03-14");
  });
  it("data incompleta ou inexistente vira null", () => {
    expect(parseBrDate("")).toBeNull();
    expect(parseBrDate("14/03/95")).toBeNull();
    expect(parseBrDate("31/02/1995")).toBeNull();
  });
});
