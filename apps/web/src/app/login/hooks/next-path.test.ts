import { describe, expect, it } from "bun:test";

import { DEFAULT_NEXT, safeNextPath } from "./next-path";

const ORIGIN = "https://bloomy.app";

describe("safeNextPath", () => {
  it("preserva a rota pedida, com query", () => {
    expect(safeNextPath("/corpo", ORIGIN)).toBe("/corpo");
    expect(safeNextPath("/treino?sessao=3", ORIGIN)).toBe("/treino?sessao=3");
  });

  it("cai no padrão quando não há next", () => {
    expect(safeNextPath(null, ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  // O caso que `startsWith("/")` deixava passar: começa com barra, mas o
  // browser resolve como outro host.
  it("recusa URL protocol-relative", () => {
    expect(safeNextPath("//evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("//evil.com/phish", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("recusa barra invertida, que o parser normaliza para host", () => {
    expect(safeNextPath("/\\evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("\\\\evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("recusa URL absoluta de outra origem", () => {
    expect(safeNextPath("https://evil.com", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("http://bloomy.app.evil.com/x", ORIGIN)).toBe(DEFAULT_NEXT);
  });

  it("aceita URL absoluta da própria origem, reduzida a caminho", () => {
    expect(safeNextPath(`${ORIGIN}/mente`, ORIGIN)).toBe("/mente");
  });

  it("recusa esquema que não navega para a origem", () => {
    expect(safeNextPath("javascript:alert(1)", ORIGIN)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("data:text/html,<script>1</script>", ORIGIN)).toBe(DEFAULT_NEXT);
  });
});
