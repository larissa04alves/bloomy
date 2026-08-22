import { createDb } from "@bloomy/db";
import * as schema from "@bloomy/db/schema/auth";
import { env } from "@bloomy/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

export function createAuth() {
  const db = createDb({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    // Desligado: o login é só Google e nada no app chama `signUp`/`signIn.email`.
    // Ligado, `/api/auth/sign-up/email` fica aberto e permite criar conta sem
    // passar por nenhuma tela — superfície sem uso.
    emailAndPassword: {
      enabled: false,
    },
    // Só ativa o provider quando as credenciais existirem (issue #4: depende
    // do Google Cloud Console). Sem `redirectURI` explícito — deriva de
    // `baseURL` + a rota catch-all `/api/auth/[...all]` que já existe.
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [nextCookies()],
  });
}

export const auth = createAuth();
