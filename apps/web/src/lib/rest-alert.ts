/** Vibração do fim do descanso: dois toques curtos e um longo, diferente do padrão
 *  das notificações do sistema. */
export const REST_VIBRATION_PATTERN = [200, 100, 200, 100, 400];

let ctx: AudioContext | null = null;

/** Cria ou retoma o `AudioContext`. Tem que rodar dentro de um gesto (o toque em
 *  "concluir série"): fora dele o Chrome cria o contexto suspenso e o bipe não sai. */
export function primeRestTone(): void {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

function beep(at: number, frequency: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  // Ataque e queda curtos: sem eles o corte seco da senoide estala.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}

/** Dois bipes curtos subindo (≈880 Hz → 1320 Hz). Gerado na hora, sem arquivo. */
export function playRestEndTone(): void {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  beep(t, 880);
  beep(t + 0.22, 1320);
}

export function vibrateRestEnd(): void {
  if (typeof navigator !== "undefined") navigator.vibrate?.(REST_VIBRATION_PATTERN);
}
