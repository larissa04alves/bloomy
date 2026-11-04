import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import type { Db } from "@bloomy/db";
import { pushSubscription, type PushSubscription } from "@bloomy/db/schema/reminder";
import { restAlarm } from "@bloomy/db/schema/workout";
import { eq } from "drizzle-orm";

import { updateProfile } from "@/server/profile/service";
import { cleanupTestDbs, createTestDb, createTestUser } from "@/server/shared/test-db";

import {
  cancelRestAlarm,
  fireRestAlarm,
  scheduleRestAlarm,
  type RestPushSender,
  type RestScheduler,
} from "./service";

let db: Db;
let userId: string;

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/phone";

/** Agendador falso: devolve msg-1, msg-2… e registra o que foi pedido. */
function fakeScheduler(opts: { failCancel?: boolean; failPublish?: boolean } = {}) {
  const published: { userId: string; endsAt: Date }[] = [];
  const cancelled: string[] = [];
  const scheduler: RestScheduler = {
    publish: async (input) => {
      if (opts.failPublish) throw new Error("qstash down");
      published.push(input);
      return `msg-${published.length}`;
    },
    cancel: async (id) => {
      cancelled.push(id);
      if (opts.failCancel) throw new Error("already delivered");
    },
  };
  return { scheduler, published, cancelled };
}

function fakeSender(result: "sent" | "gone" | "failed" = "sent") {
  const sentTo: PushSubscription[] = [];
  const send: RestPushSender = async (sub) => {
    sentTo.push(sub);
    return result;
  };
  return { send, sentTo };
}

const IN_A_MINUTE = () => new Date(Date.now() + 60_000);

async function alarmRow() {
  const [row] = await db.select().from(restAlarm).where(eq(restAlarm.userId, userId));
  return row ?? null;
}

beforeEach(async () => {
  db = await createTestDb();
  userId = await createTestUser(db);
  await db.insert(pushSubscription).values({ userId, endpoint: ENDPOINT, p256dh: "p", auth: "a" });
});

afterAll(cleanupTestDbs);

describe("scheduleRestAlarm", () => {
  test("agenda e guarda o descanso ativo com o aparelho que iniciou", async () => {
    const { scheduler, published } = fakeScheduler();

    const status = await scheduleRestAlarm(db, scheduler, userId, {
      endsAt: IN_A_MINUTE(),
      endpoint: ENDPOINT,
    });

    expect(status).toBe("scheduled");
    expect(published).toHaveLength(1);
    expect(await alarmRow()).toMatchObject({ messageId: "msg-1", endpoint: ENDPOINT });
  });

  test("reagendar cancela a mensagem anterior e guarda a nova", async () => {
    const { scheduler, cancelled } = fakeScheduler();
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });

    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });

    expect(cancelled).toEqual(["msg-1"]);
    expect((await alarmRow())?.messageId).toBe("msg-2");
  });

  test("cancelamento que falha não impede o novo agendamento", async () => {
    const { scheduler, published } = fakeScheduler({ failCancel: true });
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });

    const status = await scheduleRestAlarm(db, scheduler, userId, {
      endsAt: IN_A_MINUTE(),
      endpoint: ENDPOINT,
    });

    expect(status).toBe("scheduled");
    expect(published).toHaveLength(2);
    expect((await alarmRow())?.messageId).toBe("msg-2");
  });

  test("se publicar o novo falha, o alarme anterior continua valendo", async () => {
    const first = fakeScheduler();
    await scheduleRestAlarm(db, first.scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    const broken = fakeScheduler({ failPublish: true });

    await expect(
      scheduleRestAlarm(db, broken.scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT }),
    ).rejects.toThrow();

    expect(broken.cancelled).toHaveLength(0);
    expect((await alarmRow())?.messageId).toBe("msg-1");
  });

  test("com o aviso de descanso desligado não agenda nada", async () => {
    await updateProfile(db, userId, { restAlert: false });
    const { scheduler, published } = fakeScheduler();

    const status = await scheduleRestAlarm(db, scheduler, userId, {
      endsAt: IN_A_MINUTE(),
      endpoint: ENDPOINT,
    });

    expect(status).toBe("disabled");
    expect(published).toHaveLength(0);
    expect(await alarmRow()).toBeNull();
  });

  test("aparelho que não é da pessoa não recebe alarme", async () => {
    const other = await createTestUser(db, "other");
    const otherEndpoint = "https://fcm.googleapis.com/fcm/send/other";
    await db
      .insert(pushSubscription)
      .values({ userId: other, endpoint: otherEndpoint, p256dh: "p", auth: "a" });
    const { scheduler, published } = fakeScheduler();

    const status = await scheduleRestAlarm(db, scheduler, userId, {
      endsAt: IN_A_MINUTE(),
      endpoint: otherEndpoint,
    });

    expect(status).toBe("no_subscription");
    expect(published).toHaveLength(0);
  });
});

describe("fireRestAlarm", () => {
  test("mensagem de um descanso já reagendado é ignorada", async () => {
    const { scheduler } = fakeScheduler();
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    const { send, sentTo } = fakeSender();

    const status = await fireRestAlarm(db, send, { userId, messageId: "msg-1" });

    expect(status).toBe("stale");
    expect(sentTo).toHaveLength(0);
    expect((await alarmRow())?.messageId).toBe("msg-2");
  });

  test("a mensagem vigente envia o push só para o aparelho que iniciou", async () => {
    const { scheduler } = fakeScheduler();
    await db
      .insert(pushSubscription)
      .values({ userId, endpoint: "https://fcm.googleapis.com/fcm/send/desktop", p256dh: "p", auth: "a" });
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    const { send, sentTo } = fakeSender();

    const status = await fireRestAlarm(db, send, { userId, messageId: "msg-1" });

    expect(status).toBe("sent");
    expect(sentTo.map((s) => s.endpoint)).toEqual([ENDPOINT]);
    expect(await alarmRow()).toBeNull();
  });

  test("aviso desligado depois de agendar: o push não sai", async () => {
    const { scheduler } = fakeScheduler();
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    await updateProfile(db, userId, { restAlert: false });
    const { send, sentTo } = fakeSender();

    const status = await fireRestAlarm(db, send, { userId, messageId: "msg-1" });

    expect(status).toBe("stale");
    expect(sentTo).toHaveLength(0);
    expect(await alarmRow()).toBeNull();
  });

  test("entrega duplicada da mesma mensagem envia uma vez só", async () => {
    const { scheduler } = fakeScheduler();
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    const { send, sentTo } = fakeSender();

    const results = await Promise.all([
      fireRestAlarm(db, send, { userId, messageId: "msg-1" }),
      fireRestAlarm(db, send, { userId, messageId: "msg-1" }),
    ]);

    expect(sentTo).toHaveLength(1);
    expect(results.sort()).toEqual(["sent", "stale"]);
  });

  test("aparelho morto (gone) é removido", async () => {
    const { scheduler } = fakeScheduler();
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });
    const { send } = fakeSender("gone");

    const status = await fireRestAlarm(db, send, { userId, messageId: "msg-1" });

    expect(status).toBe("gone");
    const subs = await db.select().from(pushSubscription).where(eq(pushSubscription.endpoint, ENDPOINT));
    expect(subs).toHaveLength(0);
  });
});

describe("cancelRestAlarm", () => {
  test("cancela a mensagem e apaga o descanso ativo", async () => {
    const { scheduler, cancelled } = fakeScheduler();
    await scheduleRestAlarm(db, scheduler, userId, { endsAt: IN_A_MINUTE(), endpoint: ENDPOINT });

    await cancelRestAlarm(db, scheduler, userId);

    expect(cancelled).toEqual(["msg-1"]);
    expect(await alarmRow()).toBeNull();
  });

  test("sem descanso ativo não chama o agendador", async () => {
    const { scheduler, cancelled } = fakeScheduler();

    await cancelRestAlarm(db, scheduler, userId);

    expect(cancelled).toHaveLength(0);
  });
});
