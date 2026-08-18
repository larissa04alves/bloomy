"use client";

import {
  CloudRainIcon,
  type Icon,
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
  SunIcon,
} from "@phosphor-icons/react";

import type { Mood } from "@/lib/api-types";

const MOOD_ICON: Record<Mood, Icon> = {
  sad: CloudRainIcon,
  meh: SmileySadIcon,
  neutral: SmileyMehIcon,
  good: SmileyIcon,
  great: SunIcon,
};

/** Rótulo de cada humor — o mesmo na Hoje e na Mente, que registram o mesmo check-in. */
export const MOOD_LABEL: Record<Mood, string> = {
  sad: "Muito pra baixo",
  meh: "Pra baixo",
  neutral: "Neutro",
  good: "Bem",
  great: "Ótimo",
};

/** Face do humor: da nuvem de chuva ao sol. Compartilhada pela Hoje, Mente e registros. */
export function MoodFaceIcon({
  mood,
  size,
  color,
}: {
  mood: Mood;
  size: number;
  color?: string;
}) {
  const Face = MOOD_ICON[mood];
  return <Face size={size} weight="fill" color={color} />;
}
