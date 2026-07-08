import { CheckCircleIcon } from "@phosphor-icons/react";

import { formatDuration } from "../hooks/format";

export function SessaoFim({
  durationSec,
  exerciseCount,
  onRestart,
}: {
  durationSec: number;
  exerciseCount: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 px-5.5 pt-16 pb-8 text-center">
      <CheckCircleIcon size={88} weight="fill" className="text-green-deep" />
      <h1 className="font-display text-2xl font-bold text-ink">Treino concluído!</h1>

      <div className="flex w-full gap-3">
        <div className="flex flex-1 flex-col items-center rounded-card bg-white py-4 shadow-card-sm">
          <span className="font-display text-3xl font-bold text-ink">{exerciseCount}</span>
          <span className="text-[12px] font-semibold text-ink-read">exercícios</span>
        </div>
        <div className="flex flex-1 flex-col items-center rounded-card bg-white py-4 shadow-card-sm">
          <span className="font-display text-3xl font-bold text-ink">{formatDuration(durationSec)}</span>
          <span className="text-[12px] font-semibold text-ink-read">duração</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="mt-2 w-full rounded-full bg-lilac py-3.5 font-display font-bold text-white shadow-btn"
      >
        Voltar ao início
      </button>
    </div>
  );
}
