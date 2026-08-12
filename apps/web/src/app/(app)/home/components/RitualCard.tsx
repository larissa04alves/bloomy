import {
  CheckCircleIcon,
  type Icon,
  PlayCircleIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { IconChip } from "@/components/icon-chip";
import { ProgressBar } from "@/components/progress-bar";
import { TONE, type Tone } from "@/lib/tone";

import type { RitualAction } from "../hooks/format";

const ACTION_ICON: Record<RitualAction["kind"], Icon> = {
  play: PlayCircleIcon,
  check: CheckCircleIcon,
  plus: PlusCircleIcon,
};

/** Card de um domínio no grid da Hoje. O card inteiro é o link — a linha de ação
 *  é afordância, não um segundo alvo de toque. */
export function RitualCard({
  tone,
  icon,
  title,
  subtitle,
  href,
  progress,
  action,
}: {
  tone: Tone;
  icon: ReactNode;
  title: string;
  subtitle: string;
  href: Route;
  /** 0–1: mostra barra de progresso. */
  progress?: number;
  action?: RitualAction;
}) {
  const t = TONE[tone];
  const ActionIcon = action ? ACTION_ICON[action.kind] : null;

  return (
    // h-full + justify-between: o card acompanha a altura da linha do grid e empurra
    // a ação pro rodapé, então os quatro terminam alinhados por baixo.
    <Link
      href={href}
      className={cn(
        "flex h-full flex-col justify-between rounded-card-lg p-4",
        t.tint,
      )}
    >
      <IconChip tone={tone} variant="white" icon={icon} size="lg" />
      <div className="mt-2 flex flex-col">
        <span className="font-display text-lg font-bold text-ink">{title}</span>
        <span className="mt-0.5 line-clamp-2 text-xs font-semibold text-ink-soft">
          {subtitle}
        </span>
        {progress !== undefined ? (
          <div className="mt-2">
            <ProgressBar value={progress} tone={tone} track="white" />
          </div>
        ) : null}
        {action && ActionIcon ? (
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-xs font-bold",
              t.deep,
            )}
          >
            <ActionIcon size={16} weight="fill" />
            {action.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
