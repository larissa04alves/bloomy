import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

import { isAllowedPublicUrl } from "./public-url";

function getVercelOrigin() {
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
      : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelUrl) return undefined;
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
}

const vercelOrigin = getVercelOrigin();

/** URL pública do app: qualquer URL em dev, só `https://` em produção. */
const publicUrl = z
  .url()
  .refine((url) => isAllowedPublicUrl(url, process.env.NODE_ENV), {
    message: "must use https:// in production",
  });

const runtimeEnv = {
  ...process.env,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? vercelOrigin,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? vercelOrigin,
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: publicUrl,
    CORS_ORIGIN: publicUrl,
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    DEV_USER_EMAIL: z.email().optional(),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_EXAM_BUCKET: z.string().min(1),

    // Web Push (issue #5). Opcionais para não quebrar quem roda o app sem
    // lembretes configurados: o dispatch checa e sai em silêncio se faltarem.
    // Par gerado uma vez com `bunx web-push generate-vapid-keys`.
    VAPID_PUBLIC_KEY: z.string().min(1).optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    /** Identificação do responsável exigida pelo protocolo VAPID. */
    VAPID_SUBJECT: z.string().startsWith("mailto:").optional(),
    /** Autentica o agendador externo (cron-job.org) na rota de varredura. */
    CRON_SECRET: z.string().min(16).optional(),
  },
  runtimeEnv: runtimeEnv,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
