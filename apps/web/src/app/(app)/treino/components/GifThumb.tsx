"use client";

import { BarbellIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { IconChip } from "@/components/icon-chip";
import { cn } from "@bloomy/ui/lib/utils";

import { gifUrl } from "../hooks/gif";

export function GifThumb({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [id]);

  if (broken) {
    return (
      <IconChip
        tone="pink"
        icon={<BarbellIcon size={22} weight="fill" />}
        className={className}
      />
    );
  }

  return (
    <img
      src={gifUrl(id)}
      alt={alt}
      onError={() => setBroken(true)}
      className={cn(className, "object-cover")}
    />
  );
}
