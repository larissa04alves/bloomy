import { describe, expect, test } from "bun:test";

import { loginPathFor } from "./login-redirect";

describe("loginPathFor", () => {
  test("sem destino, vai só pro login", () => {
    expect(loginPathFor(null)).toBe("/login");
    expect(loginPathFor(undefined)).toBe("/login");
    expect(loginPathFor("")).toBe("/login");
  });

  test("guarda o pathname em ?next= codificado", () => {
    expect(loginPathFor("/mente")).toBe("/login?next=%2Fmente");
  });

  test("preserva a query string do destino", () => {
    expect(loginPathFor("/saude?tab=exames")).toBe("/login?next=%2Fsaude%3Ftab%3Dexames");
  });
});
