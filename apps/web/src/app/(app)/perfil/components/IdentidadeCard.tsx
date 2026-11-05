"use client";

import { Avatar } from "@/components/avatar";

export function IdentidadeCard({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string;
  image: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card-lg bg-lilac-tint p-5">
      <Avatar key={image ?? "none"} name={name} image={image} size="xl" />
      {name ? (
        <span className="font-display text-lg font-bold text-ink">{name}</span>
      ) : null}
      <span className="-mt-1.5 text-xs font-bold text-lilac-deep">
        {email} · conta Google
      </span>
    </div>
  );
}
