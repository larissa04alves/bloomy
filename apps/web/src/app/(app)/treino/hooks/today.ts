"use client";

import { useEffect, useState } from "react";

/**
 * Índice do dia atual (seg=0..dom=6), resolvido só após o mount.
 * Evita divergência de hidratação quando o fuso do servidor difere do cliente
 * (o destaque do dia só aparece no cliente, nunca no HTML do servidor).
 */
export function useTodayIndex(): number | null {
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => {
    setIndex((new Date().getDay() + 6) % 7);
  }, []);
  return index;
}
