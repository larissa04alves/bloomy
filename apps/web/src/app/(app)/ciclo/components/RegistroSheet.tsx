"use client";

import { DropIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";

import { BottomSheet } from "@/components/bottom-sheet";
import { ChoiceChip } from "@/components/choice-chip";

import { type RegistroSheetProps, useRegistroDraft } from "../hooks/useRegistroDraft";

export function RegistroSheet(props: RegistroSheetProps) {
  const d = useRegistroDraft(props);

  return (
    <BottomSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={d.title}
      icon={<DropIcon size={22} weight="fill" />}
      tone="peach"
      footer={
        <button
          type="button"
          disabled={d.saving}
          onClick={d.save}
          className="w-full rounded-full bg-peach py-3.5 font-display font-bold text-white shadow-btn-peach disabled:opacity-60"
        >
          {d.saveLabel}
        </button>
      }
    >
      {d.editing ? null : (
        <>
          <span className="text-sm font-bold text-ink">Sangramento</span>
          <div className="-mt-2 flex flex-wrap gap-2">
            {d.flows.map((f) => (
              <ChoiceChip key={f.id} tone="peach" selected={f.selected} onClick={() => d.pickFlow(f.id)}>
                {f.label}
              </ChoiceChip>
            ))}
          </div>
        </>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink">
          {d.editing ? "Sintomas que aparecem" : "Sintomas"}
        </span>
        <button
          type="button"
          onClick={d.toggleEditing}
          className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-ink-read"
        >
          {d.editing ? (
            "cancelar"
          ) : (
            <>
              <SlidersHorizontalIcon weight="bold" />
              editar lista
            </>
          )}
        </button>
      </div>
      <div className="-mt-2 flex flex-wrap gap-2">
        {d.symptoms.map((s) => (
          <ChoiceChip key={s.id} tone="peach" selected={s.selected} onClick={() => d.toggleSymptom(s.id)}>
            {s.label}
          </ChoiceChip>
        ))}
      </div>
      {d.editing ? (
        <p className="text-xs font-semibold text-ink-faint">
          Toque para mostrar ou esconder um sintoma no registro.
        </p>
      ) : null}
    </BottomSheet>
  );
}
