import { Receiver } from "@upstash/qstash";

/** Confere a assinatura do QStash sobre o corpo CRU (re-serializar o JSON quebra a
 *  assinatura). Chaves por parâmetro para testar sem ambiente; sem chaves, nada é
 *  aceito. */
export async function verifySignature(input: {
  signature: string | null;
  rawBody: string;
  url: string;
  keys: { current: string; next: string } | null;
}): Promise<boolean> {
  if (!input.signature || !input.keys) return false;
  const receiver = new Receiver({
    currentSigningKey: input.keys.current,
    nextSigningKey: input.keys.next,
  });
  try {
    return await receiver.verify({ signature: input.signature, body: input.rawBody, url: input.url });
  } catch {
    return false; // o SDK lança em assinatura inválida
  }
}
