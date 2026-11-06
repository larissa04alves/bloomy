"use client";

import { toast } from "sonner";

import { ApiError } from "@/lib/api";

/** Toast de erro na cor coral (nunca vermelho). */
export function toastErrorText(message: string) {
  toast.error(message, { style: { background: "#fbecef", color: "#c76e93", border: "none" } });
}

/** Extrai a mensagem de ApiError; senão usa o fallback. */
export function toastError(e: unknown, fallback = "Algo deu errado") {
  toastErrorText(e instanceof ApiError ? e.message : fallback);
}
