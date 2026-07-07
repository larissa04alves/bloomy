export function ResumoCard({
  agua,
  refeicoes,
  remedios,
}: {
  agua: { done: number; target: number };
  refeicoes: { done: number; target: number };
  remedios: { done: number; target: number };
}) {
  const cols = [
    { label: "garrafas", color: "text-lilac-deep", ...agua },
    { label: "refeições", color: "text-green-deep", ...refeicoes },
    { label: "remédios", color: "text-coral", ...remedios },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-card-lg bg-lilac-tint p-4">
      {cols.map((c) => (
        <div key={c.label} className="flex flex-col items-center gap-0.5">
          <span className={`font-display text-2xl font-bold ${c.color}`}>
            {c.done}
            <span className="text-[15px] opacity-60">/{c.target}</span>
          </span>
          <span className={`text-[11px] font-bold ${c.color}`}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
