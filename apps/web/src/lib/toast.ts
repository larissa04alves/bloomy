"use client";

import { toast } from "sonner";

import { ApiError } from "@/lib/api";

/** Toast de erro na cor coral (nunca vermelho). Extrai a mensagem de ApiError. */
export function toastError(e: unknown, fallback = "Algo deu errado") {
  const message = e instanceof ApiError ? e.message : fallback;
  toast.error(message, { style: { background: "#fbecef", color: "#c76e93", border: "none" } });
}
