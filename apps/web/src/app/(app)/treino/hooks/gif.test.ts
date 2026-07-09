import { describe, expect, it } from "bun:test";

import { gifUrl } from "./gif";

describe("gifUrl", () => {
  it("monta a URL do GIF a partir da base + id", () => {
    // NEXT_PUBLIC_EXERCISE_GIF_BASE definido no ambiente de teste? senão testar via arg.
    expect(gifUrl("0025")).toMatch(/\/0025\.gif$/);
  });
});
