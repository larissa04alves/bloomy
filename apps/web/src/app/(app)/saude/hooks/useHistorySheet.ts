"use client";

import { useState } from "react";

import type { Appointment, Exam } from "@/lib/api-types";

import type { HistoryItem } from "../components/HistorySheet";

type HistoryKind = "consulta" | "exame";

export function useHistorySheet(exames: Exam[], consultas: Appointment[]) {
  const [state, setState] = useState<{ open: boolean; kind?: HistoryKind }>({
    open: false,
  });

  const openHistory = (kind: HistoryKind) => setState({ open: true, kind });
  const onOpenChange = (open: boolean) => setState((s) => ({ ...s, open }));

  const title =
    state.kind === "exame" ? "Histórico de exames" : "Histórico de consultas";

  const items: HistoryItem[] =
    state.kind === "exame"
      ? exames.map((e) => ({
          id: e.id,
          title: e.name,
          completedAt: e.completedAt,
          isReturn: Boolean(e.parentId),
          attachment: e.attachmentName
            ? { href: `/api/exams/${e.id}/attachment`, name: e.attachmentName }
            : undefined,
        }))
      : state.kind === "consulta"
        ? consultas.map((a) => ({
            id: a.id,
            title: a.specialty
              ? `${a.professional} · ${a.specialty}`
              : a.professional,
            completedAt: a.completedAt,
            isReturn: Boolean(a.parentId),
          }))
        : [];

  return { open: state.open, onOpenChange, openHistory, title, items };
}
