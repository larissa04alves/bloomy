import Link from "next/link";

import { CALENDARIO_HREF } from "@/lib/cycle";

export function OntemCiclo({ label }: { label: string }) {
  return (
    <Link
      href={CALENDARIO_HREF}
      className="flex items-center gap-2 rounded-card border border-dashed border-hairline px-3 py-2.5"
    >
      <span className="text-xs font-bold text-ink-faint">Ontem</span>
      <span className="flex-1 truncate text-xs font-bold text-ink-read">{label}</span>
      <span className="text-xs font-bold text-peach-deep">Ver dias</span>
    </Link>
  );
}
