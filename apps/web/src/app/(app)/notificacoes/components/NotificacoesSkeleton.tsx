export function NotificacoesSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-5.5 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div className="size-9.5 animate-pulse rounded-control bg-lilac-tint" />
        <div className="h-6 w-36 animate-pulse rounded-control bg-lilac-tint" />
        <div className="size-9.5" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-lilac-tint-soft" />
        ))}
      </div>
    </div>
  );
}
