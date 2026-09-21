/* Client-safe de propósito: é validação pura de URL, sem banco — a rota importa
 * daqui e o teste roda sem `server-only`. */

/** Hosts que nunca são um push service: loopback, sufixos locais e IP literal.
 *  Push services (FCM, Mozilla, Apple, Microsoft) sempre vêm por nome DNS público. */
const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Um `endpoint` vem do navegador, mas chega ao servidor como texto qualquer — e a
 * varredura faz um POST nele a cada lembrete. Sem este filtro, uma conta autenticada
 * faria o servidor bater em `http://localhost:...` ou num IP interno (SSRF).
 *
 * Exige `https:` e recusa host local ou IP literal. Não resolve DNS de propósito:
 * custa uma consulta por cadastro e o serverless da Vercel não tem rede interna a
 * proteger — o filtro barato fecha o caso real.
 */
export function isSafePushEndpoint(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost") return false;
  if (LOCAL_SUFFIXES.some((s) => host.endsWith(s))) return false;
  // IPv6 chega entre colchetes; IPv4 é só dígitos e pontos.
  if (host.startsWith("[") || IPV4.test(host)) return false;

  return true;
}
