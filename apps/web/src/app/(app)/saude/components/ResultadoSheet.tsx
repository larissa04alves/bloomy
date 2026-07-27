"use client";

import { TestTubeIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { BottomSheet } from "@/components/bottom-sheet";
import { toastError } from "@/lib/toast";

import { AttachmentPreview } from "./AttachmentPreview";

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,image/heic";

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Fecha um exame em "aguardando resultado": anexar o laudo (opcional) e concluir.
 * Sem arquivo escolhido, conclui sem resultado — as duas saídas mandam pro histórico.
 */
export function ResultadoSheet({
  open,
  onOpenChange,
  examName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examName: string;
  onConfirm: (file?: File) => void;
}) {
  const [file, setFile] = useState<File | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (open) setFile(undefined);
  }, [open]);

  const handleFile = (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toastError(null, "Arquivo acima de 4 MB — escolha um arquivo menor.");
      return;
    }
    setFile(picked);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Resultado do exame"
      tone="lilac"
      icon={<TestTubeIcon size={22} weight="fill" />}
      footer={
        <button
          type="button"
          onClick={() => {
            onConfirm(file);
            onOpenChange(false);
          }}
          className="w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
        >
          {file ? "Anexar e concluir" : "Concluir sem resultado"}
        </button>
      }
    >
      <p className="text-sm font-semibold text-ink-read">
        {examName} está aguardando resultado. Anexe o laudo, ou conclua sem ele.
      </p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // permite reescolher o mesmo arquivo
        }}
      />

      {file ? (
        <AttachmentPreview
          name={file.name}
          mime={file.type}
          size={file.size}
          onSwap={() => inputRef.current?.click()}
          onRemove={() => setFile(undefined)}
        />
      ) : (
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-control border border-dashed border-lilac bg-lilac-tint px-4 py-4 text-center text-sm font-bold text-lilac-deep"
        >
          <UploadSimpleIcon size={18} weight="bold" className="mr-1 inline" />
          Anexar resultado
          <span className="mt-1 block text-xs font-semibold text-ink-faint">
            PDF ou imagem · até 4 MB
          </span>
        </label>
      )}
    </BottomSheet>
  );
}
