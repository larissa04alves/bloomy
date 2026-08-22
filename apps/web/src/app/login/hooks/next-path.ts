/** Rota padrão quando não há `?next=` utilizável. */
export const DEFAULT_NEXT = "/home";

/**
 * Valida o `?next=` que o redirect de 401 (`lib/api.ts`) coloca na URL do login.
 * O valor vem da barra de endereços, então é entrada não confiável: sem
 * validação, `?next=//evil.com` levaria a pessoa pra fora do site logo depois
 * de autenticar (open redirect).
 *
 * Checar `startsWith("/")` não basta — `//evil.com` e `/\evil.com` começam com
 * barra e o browser ainda assim os resolve como outro host. Resolver contra a
 * origem e comparar `origin` delega a normalização ao parser de URL, que é quem
 * decide de fato pra onde a navegação vai.
 */
export function safeNextPath(next: string | null, origin: string): string {
  if (!next) return DEFAULT_NEXT;

  try {
    const url = new URL(next, origin);
    if (url.origin !== new URL(origin).origin) return DEFAULT_NEXT;
    return url.pathname + url.search;
  } catch {
    return DEFAULT_NEXT;
  }
}
