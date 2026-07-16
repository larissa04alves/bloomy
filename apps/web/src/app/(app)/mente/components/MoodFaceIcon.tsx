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
