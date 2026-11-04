import { describe, expect, test } from "bun:test";

import { qstashConfig } from "./config";

const FULL = {
  QSTASH_TOKEN: "tok",
  QSTASH_CURRENT_SIGNING_KEY: "cur",
  QSTASH_NEXT_SIGNING_KEY: "next",
  QSTASH_URL: "https://qstash-us-east-1.upstash.io",
};

describe("qstashConfig", () => {
  test("com token e as duas chaves, o alarme fica ligado", () => {
    expect(qstashConfig(FULL)).toEqual({
      token: "tok",
      baseUrl: "https://qstash-us-east-1.upstash.io",
      keys: { current: "cur", next: "next" },
    });
  });

  test("faltando qualquer chave de assinatura, o alarme fica desligado", () => {
    expect(qstashConfig({ ...FULL, QSTASH_NEXT_SIGNING_KEY: undefined })).toBeNull();
    expect(qstashConfig({ ...FULL, QSTASH_CURRENT_SIGNING_KEY: undefined })).toBeNull();
    expect(qstashConfig({ ...FULL, QSTASH_TOKEN: undefined })).toBeNull();
  });

  test("sem URL usa a região padrão do SDK", () => {
    expect(qstashConfig({ ...FULL, QSTASH_URL: undefined })?.baseUrl).toBeUndefined();
  });
});
