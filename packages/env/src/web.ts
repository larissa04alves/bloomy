import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    // Base pública do R2 p/ os GIFs do catálogo (ex.: https://pub-xxxx.r2.dev).
    // Opcional: sem ela o catálogo ainda funciona (GIF cai no fallback de ícone).
    NEXT_PUBLIC_EXERCISE_GIF_BASE: z.url().optional(),
    // Mesma chave pública do VAPID_PUBLIC_KEY do server: o navegador precisa dela
    // para chamar `pushManager.subscribe()`. Sem ela, a tela não oferece opt-in.
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_EXERCISE_GIF_BASE: process.env.NEXT_PUBLIC_EXERCISE_GIF_BASE,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
