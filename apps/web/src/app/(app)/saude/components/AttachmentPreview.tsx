"use client";

import { ArrowsClockwiseIcon, TrashIcon } from "@phosphor-icons/react";

/** Cartão do arquivo escolhido/anexado, com trocar e remover. */
export function AttachmentPreview({
  name,
  mime,
  size,
  onSwap,
  onRemove,
}: {
  name: string;
  mime: string;
  size: number | null;
  onSwap: () => void;
  onRemove: () => void;
}) {
  const isPdf = mime === "application/pdf";

  return (
    <div className="flex items-center gap-3 rounded-control border border-hairline p-3">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-control text-xs font-black ${isPdf ? "bg-[#fdecec] text-[#e0574f]" : "bg-[#eaf4ec] text-[#3fa15a]"}`}
      >
        {isPdf ? "PDF" : "IMG"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold text-ink">{name}</span>
        {size ? (
          <span className="text-xs font-semibold text-ink-faint">
            {(size / (1024 * 1024)).toFixed(1)} MB
          </span>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Trocar arquivo"
        onClick={onSwap}
        className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-lilac-deep"
      >
        <ArrowsClockwiseIcon size={19} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Remover anexo"
        onClick={onRemove}
        className="flex h-8.5 w-8.5 items-center justify-center rounded-control text-[#c98a9a]"
      >
        <TrashIcon size={19} weight="bold" />
      </button>
    </div>
  );
}
