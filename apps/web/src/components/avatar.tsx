"use client";

import { UserIcon } from "@phosphor-icons/react";
import { useState } from "react";

const SIZE = {
  sm: { dims: "size-8 text-sm", icon: 16 },
  lg: { dims: "size-11.5 text-lg", icon: 22 },
  xl: { dims: "size-18 text-3xl", icon: 36 },
} as const;

/** `<img>` em vez de `next/image`: o host da foto varia (lh3, lh4…). `no-referrer`: o CDN
 *  do Google dá 403 a Referer desconhecido. Quem usa passa `key={image}` para zerar `broken`. */
export function Avatar({
  name,
  image,
  size,
}: {
  name: string | null;
  image: string | null;
  size: keyof typeof SIZE;
}) {
  const [broken, setBroken] = useState(false);
  const initial = name?.trim().charAt(0).toUpperCase() ?? "";
  const { dims, icon } = SIZE[size];

  if (image && !broken) {
    return (
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${dims} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      className={`grid ${dims} shrink-0 place-items-center rounded-full bg-lilac font-display font-bold text-white`}
    >
      {initial || <UserIcon size={icon} weight="fill" />}
    </span>
  );
}
