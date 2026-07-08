"use client";

import {
  BarbellIcon,
  FirstAidKitIcon,
  HeartbeatIcon,
  HouseIcon,
  type Icon,
  SmileyIcon,
} from "@phosphor-icons/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: Route; label: string; Icon: Icon }[] = [
  { href: "/home", label: "Home", Icon: HouseIcon },
  { href: "/corpo", label: "Corpo", Icon: HeartbeatIcon },
  { href: "/treino", label: "Treino", Icon: BarbellIcon },
  { href: "/mente", label: "Mente", Icon: SmileyIcon },
  { href: "/saude", label: "Saúde", Icon: FirstAidKitIcon },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 flex items-stretch justify-around border-t border-hairline-soft bg-white px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5"
          >
            <Icon
              size={24}
              weight={active ? "fill" : "regular"}
              className={active ? "text-lilac-deep" : "text-nav-inactive"}
            />
            <span
              className={
                active
                  ? "text-[10px] font-extrabold text-lilac-deep"
                  : "text-[10px] font-semibold text-nav-inactive"
              }
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
