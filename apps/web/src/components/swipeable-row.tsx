"use client";

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

const ACTION_W = 76; // largura de cada botão de ação (px)

/** Registro módulo-nível: abrir uma linha fecha as outras. */
const openRows = new Map<string, () => void>();

export function SwipeableRow({
  onEdit,
  onDelete,
  children,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0); // + = editar (dir), - = excluir (esq)
  const startX = useRef(0);
  const startOffset = useRef(0);
  const down = useRef(false); // ponteiro pressionado
  const dragging = useRef(false); // já passou do limiar → é swipe de fato

  const DRAG_THRESHOLD = 6; // px antes de considerar swipe (deixa o tap/click passar)

  const close = () => setOffset(0);

  // Registra o close p/ "uma linha aberta por vez".
  useEffect(() => {
    openRows.set(id, close);
    return () => {
      openRows.delete(id);
    };
  }, [id]);

  // Fecha ao tocar fora enquanto aberto.
  useEffect(() => {
    if (offset === 0) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [offset]);

  const onPointerDown = (e: React.PointerEvent) => {
    down.current = true;
    dragging.current = false;
    startX.current = e.clientX;
    startOffset.current = offset;
    // NÃO capturar aqui: setPointerCapture no pointerdown faz o `click` mirar o
    // container capturador em vez do botão interno (play/etc), suprimindo o onClick.
    // Só capturamos quando vira swipe de fato (onPointerMove, após o limiar).
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!down.current) return;
    const dx = e.clientX - startX.current;
    if (!dragging.current) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return; // ainda é um tap, deixa passar
      dragging.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const max = onEdit ? ACTION_W : 0;
    const min = onDelete ? -ACTION_W : 0;
    const next = Math.max(min, Math.min(max, startOffset.current + dx));
    setOffset(next);
  };

  const onPointerUp = () => {
    down.current = false;
    if (!dragging.current) return; // foi um tap: não mexe no offset, deixa o click passar
    dragging.current = false;
    if (offset > ACTION_W / 2) {
      for (const [key, fn] of openRows) if (key !== id) fn();
      setOffset(ACTION_W);
    } else if (offset < -ACTION_W / 2) {
      for (const [key, fn] of openRows) if (key !== id) fn();
      setOffset(-ACTION_W);
    } else {
      setOffset(0);
    }
  };

  return (
    <div ref={rootRef} className="relative overflow-hidden rounded-card">
      {onEdit ? (
        <button
          type="button"
          aria-label="Editar"
          onClick={() => {
            onEdit();
            close();
          }}
          className="absolute inset-y-1 left-1 flex w-17 items-center justify-center rounded-[16px] bg-lilac-tint text-lilac-deep"
        >
          <PencilSimpleIcon size={22} weight="fill" />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          aria-label="Excluir"
          onClick={() => {
            onDelete();
            close();
          }}
          className="absolute inset-y-1 right-1 flex w-17 items-center justify-center rounded-[16px] bg-coral-tint text-coral"
        >
          <TrashIcon size={22} weight="fill" />
        </button>
      ) : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${offset}px)` }}
        className="relative touch-pan-y bg-bg transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}
