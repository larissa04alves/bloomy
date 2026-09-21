import { describe, expect, test } from "bun:test";

import { isSafePushEndpoint } from "./endpoint";

describe("isSafePushEndpoint", () => {
  test("aceita os push services reais", () => {
    expect(isSafePushEndpoint("https://fcm.googleapis.com/fcm/send/abc:APA91b")).toBe(true);
    expect(isSafePushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(
      true,
    );
    expect(isSafePushEndpoint("https://web.push.apple.com/QGxyz")).toBe(true);
  });

  test("recusa http", () => {
    expect(isSafePushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
  });

  test("recusa loopback e sufixos locais", () => {
    expect(isSafePushEndpoint("https://localhost:3001/api/cron/reminders")).toBe(false);
    expect(isSafePushEndpoint("https://db.internal/admin")).toBe(false);
    expect(isSafePushEndpoint("https://router.local/")).toBe(false);
    expect(isSafePushEndpoint("https://app.localhost/")).toBe(false);
  });

  test("recusa IP literal, v4 e v6", () => {
    expect(isSafePushEndpoint("https://127.0.0.1/")).toBe(false);
    expect(isSafePushEndpoint("https://10.0.0.5/x")).toBe(false);
    expect(isSafePushEndpoint("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafePushEndpoint("https://[::1]/")).toBe(false);
  });

  test("recusa credenciais na URL e lixo", () => {
    expect(isSafePushEndpoint("https://user:pw@fcm.googleapis.com/x")).toBe(false);
    expect(isSafePushEndpoint("not a url")).toBe(false);
  });
});
