/* Client-safe, como `day.ts`: o `proxy.ts` importa daqui e roda fora do
 * runtime de Server Components. Não leva `server-only`. */

import type { Route } from "next";

export const LOGIN_PATH = "/login";

/**
 * Header que o `proxy.ts` injeta com `pathname + search` da requisição. Layouts
 * não recebem a URL, então é a única forma de um Server Component saber qual
 * rota a pessoa tentou abrir — é isso que o `redirect("/login")` precisa para
 * não perder o destino.
 */
export const PATHNAME_HEADER = "x-pathname";

/**
 * URL do login preservando o destino em `?next=`, o mesmo contrato do redirect
 * de 401 em `lib/api.ts` (o login valida com `safeNextPath` antes de usar).
 * Sem esse `next`, um clique numa notificação com sessão expirada terminava em
 * `/home`: o deep link do lembrete se perdia no caminho.
 */
export function loginPathFor(next: string | null | undefined): Route {
  if (!next) return LOGIN_PATH;
  // `typedRoutes` só confere literais; a rota é `/login`, a query é dinâmica.
  return `${LOGIN_PATH}?next=${encodeURIComponent(next)}` as Route;
}
