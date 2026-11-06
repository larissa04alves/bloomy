"use client";

import { useEffect, useRef, useState } from "react";

import type { CycleDayBody } from "@/lib/api-types";
import {
  CYCLE_FLOWS,
  CYCLE_SYMPTOM_IDS,
  CYCLE_SYMPTOMS,
  type CycleFlow,
  type CycleSymptom,
  FLOW_LABELS,
} from "@/lib/cycle";
import { dayFor } from "@/server/shared/day";

import { registroTitle } from "./format";

export type RegistroSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: string;
  initial: { flow: CycleFlow | null; symptoms: CycleSymptom[] };
  hiddenSymptoms: CycleSymptom[];
  /** `false` mantém a sheet aberta (falhou salvar). */
  onSave: (day: string, entry: CycleDayBody) => Promise<boolean>;
  onHiddenChange: (ids: CycleSymptom[]) => Promise<boolean>;
};

const toggle = <T>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

export function useRegistroDraft({
  open,
  onOpenChange,
  day,
  initial,
  hiddenSymptoms,
  onSave,
  onHiddenChange,
}: RegistroSheetProps) {
  const [flow, setFlow] = useState<CycleFlow | null>(initial.flow);
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>(initial.symptoms);
  const [hidden, setHidden] = useState<CycleSymptom[]>(hiddenSymptoms);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cada abertura ganha um número: um salvamento que termina depois de fechar e reabrir a sheet
  // não pode fechar o registro novo.
  const opening = useRef(0);
  // Semeia o rascunho só na abertura: `initial` costuma vir de um objeto novo a cada render.
  useEffect(() => {
    if (!open) return;
    opening.current += 1;
    setFlow(initial.flow);
    setSymptoms(initial.symptoms);
    setHidden(hiddenSymptoms);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dependência deliberada só em `open`, ver comentário acima
  }, [open]);

  // Sintoma escondido que já está marcado no dia continua à vista, senão não dá para desmarcar.
  const symptomIds = editing
    ? CYCLE_SYMPTOM_IDS
    : CYCLE_SYMPTOM_IDS.filter((id) => !hidden.includes(id) || symptoms.includes(id));

  const save = async () => {
    const started = opening.current;
    setSaving(true);
    try {
      if (editing) {
        if (await onHiddenChange(hidden)) setEditing(false);
      } else if ((await onSave(day, { flow: flow ?? "none", symptoms })) && started === opening.current) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    title: registroTitle(day, dayFor()),
    flows: CYCLE_FLOWS.map((id) => ({ id, label: FLOW_LABELS[id], selected: flow === id })),
    pickFlow: (id: CycleFlow) => setFlow((cur) => (cur === id ? null : id)),
    symptoms: symptomIds.map((id) => ({
      id,
      label: CYCLE_SYMPTOMS[id],
      selected: editing ? !hidden.includes(id) : symptoms.includes(id),
    })),
    toggleSymptom: (id: CycleSymptom) =>
      editing ? setHidden((h) => toggle(h, id)) : setSymptoms((s) => toggle(s, id)),
    editing,
    toggleEditing: () => {
      if (editing) setHidden(hiddenSymptoms);
      setEditing(!editing);
    },
    saving,
    saveLabel: editing ? "Salvar lista" : "Salvar",
    save,
  };
}
