import type { AnchorKind, CicloView } from "../hooks/useCiclo";

const BUTTON = "w-full rounded-full bg-peach-tint py-3 font-display text-sm font-bold text-peach-deep";

export function AcoesCartela({
  anchors,
  onAsk,
}: {
  anchors: NonNullable<CicloView["anchors"]>;
  onAsk: (kind: AnchorKind) => void;
}) {
  if (!anchors.canStartPause && !anchors.canExtend) return null;
  return (
    <div className="flex flex-col gap-2">
      {anchors.canStartPause ? (
        <button type="button" onClick={() => onAsk("pause_started")} className={BUTTON}>
          {anchors.confirm.pause_started.action}
        </button>
      ) : null}
      {anchors.canExtend ? (
        <button type="button" onClick={() => onAsk("pack_extended")} className={BUTTON}>
          {anchors.confirm.pack_extended.action}
        </button>
      ) : null}
    </div>
  );
}
