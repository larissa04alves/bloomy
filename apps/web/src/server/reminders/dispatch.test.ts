import { describe, expect, test } from "bun:test";

import { SEND_OPTIONS } from "./dispatch";
import { TOLERANCE_MINUTES } from "./slots";

describe("opções de envio", () => {
  test("urgência alta: o Android segura push normal enquanto o celular dorme", () => {
    expect(SEND_OPTIONS.urgency).toBe("high");
  });

  test("TTL igual à tolerância: lembrete atrasado além dela é descartado no push service", () => {
    expect(SEND_OPTIONS.TTL).toBe(TOLERANCE_MINUTES * 60);
  });
});
