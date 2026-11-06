export type Tone = "lilac" | "green" | "pink" | "coral" | "peach";

/** Classes por tom: fundo tint, fundo cheio, texto profundo. Estáticas (Tailwind não
 *  varre string concatenada — cada classe aparece literal aqui). */
export const TONE: Record<Tone, { tint: string; solid: string; deep: string }> = {
  lilac: { tint: "bg-lilac-tint", solid: "bg-lilac", deep: "text-lilac-deep" },
  green: { tint: "bg-green-tint", solid: "bg-green-mid", deep: "text-green-deep" },
  pink: { tint: "bg-pink-tint", solid: "bg-pink-bright", deep: "text-pink-deep" },
  coral: { tint: "bg-coral-tint", solid: "bg-coral", deep: "text-coral" },
  peach: { tint: "bg-peach-tint", solid: "bg-peach", deep: "text-peach-deep" },
};
