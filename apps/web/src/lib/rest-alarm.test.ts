import { describe, expect, test } from "bun:test";

import { createRestAlarmClient } from "./rest-alarm";

/** Chamada de rede controlada pelo teste: só termina quando `release` é chamado. */
function deferredCall(log: string[], name: string) {
  const pending: (() => void)[] = [];
  const call = async () => {
    log.push(`${name}:start`);
    await new Promise<void>((resolve) => pending.push(resolve));
    log.push(`${name}:end`);
  };
  return { call, release: () => pending.shift()?.() };
}

describe("createRestAlarmClient", () => {
  test("pular logo depois de começar: o cancelamento só sai depois do agendamento", async () => {
    const log: string[] = [];
    const post = deferredCall(log, "post");
    const client = createRestAlarmClient({
      endpoint: async () => "https://push/device",
      post: post.call,
      del: async () => {
        log.push("del");
      },
    });

    const scheduled = client.schedule(1_000);
    const cancelled = client.cancel();
    await Promise.resolve();
    await Promise.resolve();
    expect(log).toEqual(["post:start"]); // o DELETE espera o POST em voo

    post.release();
    await Promise.all([scheduled, cancelled]);
    expect(log).toEqual(["post:start", "post:end", "del"]);
  });

  test("+15 s repetido: os agendamentos chegam na ordem em que foram pedidos", async () => {
    const sent: number[] = [];
    const client = createRestAlarmClient({
      endpoint: async () => "https://push/device",
      post: async (body) => {
        // o primeiro demora mais que o segundo: sem fila, chegaria por último
        await new Promise((r) => setTimeout(r, body.endsAt === 1 ? 20 : 0));
        sent.push(body.endsAt);
      },
      del: async () => {},
    });

    await Promise.all([client.schedule(1), client.schedule(2)]);

    expect(sent).toEqual([1, 2]);
  });

  test("falha numa chamada não trava as próximas", async () => {
    const log: string[] = [];
    const client = createRestAlarmClient({
      endpoint: async () => "https://push/device",
      post: async () => {
        throw new Error("offline");
      },
      del: async () => {
        log.push("del");
      },
    });

    await client.schedule(1);
    await client.cancel();

    expect(log).toEqual(["del"]);
  });

  test("aparelho sem push não agenda nada", async () => {
    let posted = false;
    const client = createRestAlarmClient({
      endpoint: async () => null,
      post: async () => {
        posted = true;
      },
      del: async () => {},
    });

    await client.schedule(1);

    expect(posted).toBe(false);
  });
});
