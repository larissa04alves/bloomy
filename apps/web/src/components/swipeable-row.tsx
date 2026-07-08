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
  const dragging = useRef(false);

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
    dragging.current = true;
    startX.current = e.clientX;
    startOffset.current = offset;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const max = onEdit ? ACTION_W : 0;
    const min = onDelete ? -ACTION_W : 0;
    const next = Math.max(
      min,
      Math.min(max, startOffset.current + (e.clientX - startX.current)),
    );
    setOffset(next);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
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
