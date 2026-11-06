import { DropHalfBottomIcon, MoonIcon, PencilSimpleIcon, PillIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@bloomy/ui/lib/utils";

import { IconChip } from "@/components/icon-chip";

import type { CicloCard, PillDot } from "../hooks/useCiclo";

const DOT: Record<PillDot, string> = {
  taken: "bg-peach-deep",
  missed: "bg-white border border-dashed border-ink-faint",
  current: "bg-white ring-2 ring-peach-deep",
  left: "bg-white",
  "pause-left": "border border-dashed border-peach-deep/50",
};

// Sem `label` as bolinhas repetem o título (dia da pausa) e ficam fora do leitor de tela.
function Dots({ dots, label }: { dots: PillDot[]; label?: string }) {
  return (
    <div
      className="grid grid-cols-7 gap-1.5 px-1"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {dots.map((d, i) => (
        <span key={i} className={cn("size-3.5 rounded-full", DOT[d])} />
      ))}
    </div>
  );
}

function Heading({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <IconChip tone="peach" variant="white" size="lg" icon={icon} />
      <div className="flex flex-col">
        <span className="font-display text-lg font-bold text-ink">{title}</span>
        <span className="text-xs font-semibold text-ink-read">{detail}</span>
      </div>
    </div>
  );
}

export function ResumoCiclo({ card, onFixPause }: { card: CicloCard; onFixPause: () => void }) {
  if (card.kind === "natural") {
    const { period, from, to } = card.ring;
    return (
      <div className="flex flex-col items-center gap-3 rounded-card-lg bg-peach-tint p-4">
        <div
          className="relative grid size-36 place-items-center rounded-full"
          style={{
            // Hex literal: o Tailwind 4 só emite a variável de tema que alguma classe usa.
            background: `conic-gradient(#e8916f 0 ${period}%, #ffffff ${period}% ${from}%, #f7d3c3 ${from}% ${to}%, #ffffff ${to}%)`,
          }}
        >
          <div className="absolute inset-3 rounded-full bg-peach-tint" />
          <div className="relative flex flex-col items-center">
            <span className="font-display text-4xl leading-none font-bold text-peach-deep">
              {card.cycleDay}
            </span>
            <span className="text-xs font-bold text-peach-deep">dia do ciclo</span>
          </div>
        </div>
        {card.late ? (
          <span className="text-center text-xs font-semibold text-ink-read">{card.late}</span>
        ) : (
          <span className="text-center text-xs font-semibold text-ink-read">
            Próxima menstruação
            <br />
            <b className="font-display text-base text-peach-deep">{card.window}</b>
          </span>
        )}
      </div>
    );
  }

  if (card.kind === "continuous") {
    return (
      <div className="flex flex-col gap-3 rounded-card-lg bg-peach-tint p-4">
        <Heading
          icon={<DropHalfBottomIcon size={22} weight="fill" />}
          title={card.title}
          detail={card.detail}
        />
        <span className="text-xs font-semibold text-ink-read">{card.note}</span>
      </div>
    );
  }

  if (card.kind === "pause") {
    return (
      <div className="flex flex-col gap-3 rounded-card-lg bg-peach-tint p-4">
        <Heading icon={<MoonIcon size={22} weight="fill" />} title={card.title} detail={card.detail} />
        <Dots dots={card.dots} />
        <button
          type="button"
          onClick={onFixPause}
          className="inline-flex min-h-9 items-center gap-1 self-start text-xs font-bold text-peach-deep"
        >
          <PencilSimpleIcon weight="bold" />
          Começou em outro dia?
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card-lg bg-peach-tint p-4">
      <Heading icon={<PillIcon size={22} weight="fill" />} title={card.title} detail={card.detail} />
      {card.dots ? <Dots dots={card.dots.list} label={card.dots.label} /> : null}
      <div className="flex items-center gap-1.5">
        {card.units.map((fill, i) => (
          <span key={i} className="h-1.75 flex-1 overflow-hidden rounded-full bg-white">
            <span className="block h-full rounded-full bg-peach" style={{ width: `${fill * 100}%` }} />
          </span>
        ))}
        <span className="h-1.75 w-6 rounded-full border border-dashed border-peach-deep/50" />
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-bold text-peach-deep">
        <MoonIcon weight="fill" className="text-base" />
        {card.nextPause}
      </span>
    </div>
  );
}
