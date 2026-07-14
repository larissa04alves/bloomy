// Base pública do R2 exposta ao client. Setup real (env registrada em packages/env,
// bucket, CDN) é tarefa adiada — aqui só o helper que monta a URL.
const BASE = process.env.NEXT_PUBLIC_EXERCISE_GIF_BASE ?? "";

export function gifUrl(id: string): string {
  return `${BASE}/${id}.gif`;
}
