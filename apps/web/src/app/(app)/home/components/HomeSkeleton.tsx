export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-5.5 pt-6 pb-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-44 animate-pulse rounded-control bg-lilac-tint" />
          <div className="h-4 w-32 animate-pulse rounded-control bg-lilac-tint-soft" />
        </div>
        <div className="size-11.5 animate-pulse rounded-full bg-lilac-tint" />
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="size-13 animate-pulse rounded-control bg-lilac-tint-soft" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-card-lg bg-lilac-tint-soft" />
        ))}
      </div>
      <div className="h-19 animate-pulse rounded-card-lg bg-lilac-tint-soft" />
    </div>
  );
}
