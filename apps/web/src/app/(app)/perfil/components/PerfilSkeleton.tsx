export function PerfilSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div className="size-9.5 animate-pulse rounded-control bg-lilac-tint" />
        <div className="h-6 w-28 animate-pulse rounded-control bg-lilac-tint" />
        <div className="size-9.5" />
      </div>
      <div className="h-40 animate-pulse rounded-card-lg bg-lilac-tint" />
      <div className="flex flex-col gap-3">
        <div className="h-5 w-24 animate-pulse rounded-control bg-lilac-tint" />
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-lilac-tint-soft" />
        ))}
      </div>
    </div>
  );
}
