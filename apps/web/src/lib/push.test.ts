import { describe, expect, it } from "bun:test";

import { ApiError } from "./api";
import { isMissingSubscriptionError, urlBase64ToUint8Array } from "./push";

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
