import { describe, expect, it } from "bun:test";

import { ApiError } from "./api";
import {
  isMissingSubscriptionError,
  sameApplicationServerKey,
  urlBase64ToUint8Array,
} from "./push";

describe("sameApplicationServerKey", () => {
  const key = urlBase64ToUint8Array("Qmxvb215");

  it("aceita a mesma chave em outro buffer", () => {
    expect(sameApplicationServerKey(Uint8Array.from(key).buffer, key)).toBe(true);
  });

  it("rejeita chave diferente do mesmo tamanho", () => {
    const other = Uint8Array.from(key);
    other[0] ^= 1;
    expect(sameApplicationServerKey(other.buffer, key)).toBe(false);
  });

  it("rejeita chave de tamanho diferente", () => {
    expect(sameApplicationServerKey(new Uint8Array(3).buffer, key)).toBe(false);
  });

  it("trata ausência da chave como diferente — recriar é o caminho seguro", () => {
    expect(sameApplicationServerKey(null, key)).toBe(false);
    expect(sameApplicationServerKey(undefined, key)).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodifica base64url para os bytes originais", () => {
    // "Bloomy" em base64 padrão é "Qmxvb215" — sem caractere especial nem padding.
    expect([...urlBase64ToUint8Array("Qmxvb215")]).toEqual([66, 108, 111, 111, 109, 121]);
  });

  it("traduz - e _ do alfabeto base64url", () => {
    // Bytes 0xFB 0xFF 0xBE viram "+/++" em base64 padrão e "-_--" em base64url.
    expect([...urlBase64ToUint8Array("-_--")]).toEqual([251, 255, 190]);
  });

  it("repõe o padding que a chave VAPID não traz", () => {
    // "QQ" precisa de "==" para fechar o quarteto; sem isso o atob lança.
    expect([...urlBase64ToUint8Array("QQ")]).toEqual([65]);
  });

  it("devolve o tamanho que o applicationServerKey espera de uma chave VAPID", () => {
    // Chave pública VAPID real tem 65 bytes (P-256 descomprimida) = 87 chars base64url.
    const key = "B" + "A".repeat(86);
    expect(urlBase64ToUint8Array(key).length).toBe(65);
  });
});

describe("isMissingSubscriptionError", () => {
  it("reconhece ApiError 404 como benigno — a linha já não está lá", () => {
    expect(isMissingSubscriptionError(new ApiError(404, "not found"))).toBe(true);
  });

  it("não trata ApiError 500 como benigno", () => {
    expect(isMissingSubscriptionError(new ApiError(500, "internal error"))).toBe(false);
  });

  it("não trata um erro qualquer (rede fora, etc.) como benigno", () => {
    expect(isMissingSubscriptionError(new Error("network error"))).toBe(false);
  });
});
