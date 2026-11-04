import { describe, expect, test } from "bun:test";

import { verifySignature } from "./signature";

const KEYS = { current: "sig_current_test", next: "sig_next_test" };
const URL = "http://localhost:3001/api/rest-alarm/fire";

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString("base64url");

/** Assina como o QStash: JWT HS256 com o hash SHA-256 do corpo no claim `body`. */
async function qstashToken(
  key: string,
  rawBody: string,
  url: string,
  expiresIn = 300,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const bodyHash = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody)));
  const claims = { iss: "Upstash", sub: url, exp: now + expiresIn, nbf: now - 600, iat: now - 600, jti: "t", body: bodyHash };
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const hmac = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

describe("verifySignature", () => {
  test("aceita a assinatura do QStash sobre o corpo cru", async () => {
    const rawBody = JSON.stringify({ userId: "u1" });
    const signature = await qstashToken(KEYS.current, rawBody, URL);
    expect(await verifySignature({ signature, rawBody, url: URL, keys: KEYS })).toBe(true);
  });

  test("corpo alterado depois de assinado não aceita", async () => {
    const signature = await qstashToken(KEYS.current, JSON.stringify({ userId: "u1" }), URL);
    expect(
      await verifySignature({ signature, rawBody: JSON.stringify({ userId: "u2" }), url: URL, keys: KEYS }),
    ).toBe(false);
  });

  test("assinatura feita para outra URL não aceita", async () => {
    const rawBody = JSON.stringify({ userId: "u1" });
    const signature = await qstashToken(KEYS.current, rawBody, "http://outra-url.test/api/rest-alarm/fire");
    expect(await verifySignature({ signature, rawBody, url: URL, keys: KEYS })).toBe(false);
  });

  test("token expirado não aceita", async () => {
    const rawBody = JSON.stringify({ userId: "u1" });
    const signature = await qstashToken(KEYS.current, rawBody, URL, -60);
    expect(await verifySignature({ signature, rawBody, url: URL, keys: KEYS })).toBe(false);
  });

  test("sem assinatura não aceita", async () => {
    expect(await verifySignature({ signature: null, rawBody: "{}", url: URL, keys: KEYS })).toBe(false);
  });

  test("assinatura forjada não aceita", async () => {
    expect(
      await verifySignature({ signature: "not.a.jwt", rawBody: "{}", url: URL, keys: KEYS }),
    ).toBe(false);
  });

  test("sem chaves no ambiente nada é aceito", async () => {
    expect(
      await verifySignature({ signature: "not.a.jwt", rawBody: "{}", url: URL, keys: null }),
    ).toBe(false);
  });
});
