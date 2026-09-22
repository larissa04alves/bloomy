/**
 * Em produção o app é servido só por HTTPS. Um `http://` em `BETTER_AUTH_URL`
 * ou `CORS_ORIGIN` passa na validação de URL mas quebra em runtime: o
 * better-auth monta o callback do Google a partir de `baseURL`, e o Google
 * recusa `http://` fora de localhost (`redirect_uri_mismatch`). Falhar no
 * build é mais barato que descobrir isso na tela de login.
 */
export function isAllowedPublicUrl(url: string, nodeEnv: string | undefined): boolean {
  if (nodeEnv !== "production") return true;
  return url.startsWith("https://");
}
