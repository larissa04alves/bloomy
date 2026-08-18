"use client";

export function HomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5.5 text-center">
      <p className="font-display text-lg font-bold text-ink">Não conseguimos carregar seu dia</p>
      <p className="text-sm font-semibold text-ink-read">
        Pode ser a conexão. Tenta de novo em um instante.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 min-h-11 rounded-control bg-lilac px-5 font-display text-sm font-bold text-white shadow-btn"
      >
        Tentar de novo
      </button>
    </div>
  );
}
