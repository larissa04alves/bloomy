import { afterEach, describe, expect, it, mock } from "bun:test";

import { ApiError, api } from "./api";

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

/** `window` mínimo: o client só lê pathname/search e chama location.replace. */
function stubWindow(pathname: string, search: string, replace: (url: string) => void) {
  globalThis.window = { location: { pathname, search, replace } } as unknown as Window &
    typeof globalThis;
}

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = mock(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  ) as unknown as typeof fetch;
}

describe("api client", () => {
  it("retorna o JSON parseado em 200", async () => {
    mockFetch(200, { totalMl: 250 });
    const data = await api.get<{ totalMl: number }>("/api/water");
    expect(data.totalMl).toBe(250);
  });

  it("lança ApiError com a mensagem de {error} em resposta não-ok", async () => {
    mockFetch(409, { error: "já marcada" });
    let caught: unknown;
    try {
      await api.post("/api/intakes", { medicationId: "x", time: "09:00" });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(409);
    expect((caught as ApiError).message).toBe("já marcada");
  });

  it("em 401 lança ApiError e manda pro login guardando a rota atual", async () => {
    mockFetch(401, { error: "unauthorized" });
    const replace = mock((_url: string) => {});
    stubWindow("/corpo", "?aba=peso", replace);

    let caught: unknown;
    try {
      await api.get("/api/weights");
    } catch (e) {
      caught = e;
    }

    expect((caught as ApiError).status).toBe(401);
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fcorpo%3Faba%3Dpeso");
  });

  it("não redireciona se já está no login (evita loop)", async () => {
    mockFetch(401, { error: "unauthorized" });
    const replace = mock((_url: string) => {});
    stubWindow("/login", "", replace);

    let caught: unknown;
    try {
      await api.get("/api/today");
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(replace).not.toHaveBeenCalled();
  });

  it("retorna undefined em 204", async () => {
    mockFetch(204, undefined);
    const data = await api.del("/api/meals/1");
    expect(data).toBeUndefined();
  });
});
