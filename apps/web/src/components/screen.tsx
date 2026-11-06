import type { ReactNode } from "react";

export function Screen({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {subtitle ? (
            <p className="text-sm font-semibold text-ink-read">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function ScreenSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3 px-5.5 pt-6">
      <div className="h-7 w-40 animate-pulse rounded-control bg-lilac-tint" />
      <div className="h-24 w-full animate-pulse rounded-card bg-lilac-tint-soft" />
      <div className="h-24 w-full animate-pulse rounded-card bg-lilac-tint-soft" />
      <p className="pt-2 text-center text-xs font-bold text-ink-faint">
        {label} · em breve
      </p>
    </div>
  );
}
