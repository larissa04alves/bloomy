export function CicloSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-28 animate-pulse rounded-control bg-lilac-tint" />
        <div className="h-4 w-52 animate-pulse rounded-control bg-lilac-tint-soft" />
      </div>
      <div className="h-44 animate-pulse rounded-card-lg bg-peach-tint" />
      <div className="h-16 animate-pulse rounded-card bg-lilac-tint-soft" />
      <div className="h-16 animate-pulse rounded-card bg-lilac-tint-soft" />
    </div>
  );
}
