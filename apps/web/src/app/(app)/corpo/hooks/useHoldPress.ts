"use client";

import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/** Toque chama `onTap`; segurar por `holdMs` chama `onHold` no lugar do toque.
 *  O toque vai pelo `onClick`, então Enter/Espaço também contam como toque.
 *  `holding` só liga depois de `showAfterMs`: um toque rápido não mostra o anel. */
export function useHoldPress({
  onTap,
  onHold,
  canHold,
  holdMs = 800,
  showAfterMs = 200,
}: {
  onTap: () => void;
  onHold: () => void;
  canHold: boolean;
  holdMs?: number;
  showAfterMs?: number;
}) {
  const [holding, setHolding] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // O `click` chega depois do `pointerup`: é por aqui que ele sabe que o gesto já foi um segurar.
  const held = useRef(false);

  const cancel = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setHolding(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    holding,
    /** Quanto o anel leva para fechar, contado a partir de quando ele aparece. */
    ringMs: holdMs - showAfterMs,
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        held.current = false;
        if (e.button !== 0 || !canHold) return;
        timers.current = [
          setTimeout(() => setHolding(true), showAfterMs),
          setTimeout(() => {
            held.current = true;
            timers.current = [];
            setHolding(false);
            onHold();
          }, holdMs),
        ];
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
      onClick: () => {
        if (held.current) {
          held.current = false;
          return;
        }
        onTap();
      },
    },
  };
}
