"use client";

const inputCls =
  "w-14 rounded-control border border-hairline bg-white px-2 py-3 text-center text-sm font-semibold text-ink placeholder:text-ink-faint focus:border-lilac focus:outline-none";

/** Mantém só dígitos (máx. 2) e limita ao máximo (23 hora / 59 minuto). "" enquanto vazio. */
function clampField(raw: string, max: number): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (digits === "") return "";
  return String(Math.min(Number(digits), max));
}

const pad2 = (v: string) => (v === "" ? "00" : v.padStart(2, "0"));

/** Hora em 24h: dois campos digitáveis (HH : MM), no mesmo visual dos outros inputs. */
export function TimeSelect({
  hour,
  minute,
  onChange,
}: {
  hour: string;
  minute: string;
  onChange: (next: { hour: string; minute: string }) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        inputMode="numeric"
        aria-label="Hora"
        value={hour}
        placeholder="09"
        onChange={(e) => onChange({ hour: clampField(e.target.value, 23), minute })}
        onBlur={() => onChange({ hour: pad2(hour), minute })}
        className={inputCls}
      />
      <span className="font-display text-lg font-bold text-ink">:</span>
      <input
        inputMode="numeric"
        aria-label="Minuto"
        value={minute}
        placeholder="00"
        onChange={(e) => onChange({ hour, minute: clampField(e.target.value, 59) })}
        onBlur={() => onChange({ hour, minute: pad2(minute) })}
        className={inputCls}
      />
    </div>
  );
}
