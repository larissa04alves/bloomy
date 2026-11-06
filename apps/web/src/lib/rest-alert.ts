/** Vibração do fim do descanso: dois toques curtos e um longo, diferente do padrão
 *  das notificações do sistema. */
export const REST_VIBRATION_PATTERN = [200, 100, 200, 100, 400];

let ctx: AudioContext | null = null;

/** Cria ou retoma o `AudioContext`. Tem que rodar dentro de um gesto (o toque em
 *  "concluir série"): fora dele o Chrome cria o contexto suspenso e o som não sai. */
export function primeRestTone(): void {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}

// Timbre de kalimba: fundamental + parcial em ≈4×, cada um com [razão, amplitude, fração da queda].
const KALIMBA_PARTIALS = [
  [1, 1, 1],
  [4.02, 0.18, 0.15],
] as const;
const PARTIALS_TOTAL = KALIMBA_PARTIALS.reduce((sum, [, amp]) => sum + amp, 0);

// Nota dedilhada: ataque de 5 ms e queda exponencial. Soa sozinha até sumir, sem o corte seco
// do bipe sustentado; destaca-se da música pelo timbre, não pelo volume.
function pluck(at: number, frequency: number, decay: number): void {
  if (!ctx) return;
  for (const [ratio, amp, fall] of KALIMBA_PARTIALS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency * ratio;
    const end = at + decay * fall;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime((0.5 * amp) / PARTIALS_TOTAL, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(end + 0.02);
  }
}

/** Arpejo de kalimba subindo (Dó6, Mi6, Sol6, Dó7), a última nota mais longa. Gerado na hora, sem arquivo. */
export function playRestEndTone(): void {
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  [1047, 1319, 1568, 2093].forEach((frequency, i) => pluck(t + i * 0.14, frequency, i === 3 ? 0.7 : 0.45));
}

export function vibrateRestEnd(): void {
  if (typeof navigator !== "undefined") navigator.vibrate?.(REST_VIBRATION_PATTERN);
}
