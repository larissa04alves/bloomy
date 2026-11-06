import { CheckIcon, ShieldCheckIcon } from "@phosphor-icons/react";

import { cn } from "@bloomy/ui/lib/utils";

const PRIVACY = [
  "Ninguém mais vê o que você registra",
  "Nada é usado para anúncio",
  "Apague tudo quando quiser, no perfil",
];

export function CyclePrivacyCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full rounded-card bg-white p-4 text-left shadow-card-sm",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-display text-sm font-bold text-ink">
        <ShieldCheckIcon size={18} weight="fill" className="text-green-deep" />
        Seus dados, são só seus
      </p>
      <ul className="space-y-1 pt-2 text-xs font-semibold text-ink-read">
        {PRIVACY.map((line) => (
          <li key={line} className="flex gap-2">
            <CheckIcon
              size={14}
              weight="bold"
              className="mt-px shrink-0 text-green-deep"
            />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
