import type { ReactNode } from "react";

/**
 * Overlay global de carregamento: desfoca a tela e mostra um ícone no centro.
 * O ícone é passado via `children` (a tela escolhe qual) — mantém o componente
 * neutro e reutilizável. Escopado à coluna do app (`max-w-105`), igual às demais
 * overlays.
 */
export function LoadingOverlay({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-50 mx-auto flex max-w-105 flex-col items-center justify-center gap-4 bg-bg/55 backdrop-blur-md"
    >
      <div className="relative grid place-items-center">
        <span className="absolute size-20 animate-ping rounded-full bg-lilac-tint" />
        <span className="relative grid size-20 place-items-center rounded-full bg-white shadow-card-sm">
          {children}
        </span>
      </div>
      {label ? (
        <p className="text-sm font-bold text-ink-read">{label}</p>
      ) : null}
    </div>
  );
}
