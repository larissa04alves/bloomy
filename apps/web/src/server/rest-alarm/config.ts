export type QstashConfig = {
  token: string;
  baseUrl?: string;
  keys: { current: string; next: string };
};

/** Configuração do QStash, ou `null` (alarme desligado). Exige token E as duas
 *  chaves juntas: com o token sozinho o agendamento funcionaria, mas todo callback
 *  seria recusado por assinatura — falha silenciosa. */
export function qstashConfig(vars: {
  QSTASH_TOKEN?: string;
  QSTASH_CURRENT_SIGNING_KEY?: string;
  QSTASH_NEXT_SIGNING_KEY?: string;
  QSTASH_URL?: string;
}): QstashConfig | null {
  const { QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY, QSTASH_URL } = vars;
  if (!QSTASH_TOKEN || !QSTASH_CURRENT_SIGNING_KEY || !QSTASH_NEXT_SIGNING_KEY) return null;
  return {
    token: QSTASH_TOKEN,
    ...(QSTASH_URL && { baseUrl: QSTASH_URL }),
    keys: { current: QSTASH_CURRENT_SIGNING_KEY, next: QSTASH_NEXT_SIGNING_KEY },
  };
}
