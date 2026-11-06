export function ResumoMedias({ averages }: { averages: { cycle: string; period: string } }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-card-lg bg-peach-tint p-4">
      <Media value={averages.cycle} label="ciclo médio" />
      <Media value={averages.period} label="menstruação" />
    </div>
  );
}

function Media({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-display text-2xl font-bold text-peach-deep">
        {value}
        <span className="text-base opacity-60"> dias</span>
      </span>
      <span className="text-xs font-bold text-peach-deep">{label}</span>
    </div>
  );
}
