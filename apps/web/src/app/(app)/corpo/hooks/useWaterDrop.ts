"use client";

import { useState } from "react";

import { waterLevel } from "./format";
import { useHoldPress } from "./useHoldPress";

/** Um registro que a gota anima: o pingo cai (add) ou sobe (remove). */
export type DropBurst = { id: number; kind: "add" | "remove" };

/** Regras da gota da Hidratação: quando beber/tirar vale, o nível e a reação a cada registro. */
export function useWaterDrop({
  totalMl,
  goalMl,
  portionReady,
  canAdd,
  canRemove,
  onAddPortion,
  onRemoveLast,
}: {
  totalMl: number;
  goalMl: number;
  portionReady: boolean;
  canAdd: boolean;
  canRemove: boolean;
  onAddPortion: () => void;
  onRemoveLast: () => void;
}) {
  const [burst, setBurst] = useState<DropBurst | null>(null);
  const canDrink = portionReady && canAdd;

  const drink = () => {
    if (!canDrink) return;
    onAddPortion();
    setBurst((prev) => ({ id: (prev?.id ?? 0) + 1, kind: "add" }));
  };
  const undo = () => {
    if (!canRemove) return;
    onRemoveLast();
    setBurst((prev) => ({ id: (prev?.id ?? 0) + 1, kind: "remove" }));
  };
  const hold = useHoldPress({ onTap: drink, onHold: undo, canHold: canRemove });

  return {
    burst,
    hold,
    canDrink,
    undo,
    level: waterLevel(totalMl, goalMl),
    leftMl: Math.max(0, goalMl - totalMl),
  };
}
