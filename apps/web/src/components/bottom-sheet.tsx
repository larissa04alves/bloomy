"use client";

import type { ReactNode } from "react";

import { Drawer } from "vaul";

import { IconChip } from "@/components/icon-chip";
import type { Tone } from "@/lib/tone";

export function BottomSheet({
  open,
  onOpenChange,
  title,
  icon,
  tone,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon: ReactNode;
  tone: Tone;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-[#2b2640]/42" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-105 flex-col rounded-t-sheet bg-white shadow-sheet outline-none"
        >
          <div className="mx-auto mt-2 mb-1 h-1.25 w-10 shrink-0 rounded-full bg-control-off" />
          <div className="flex items-center gap-3 px-5.5 pt-2">
            <IconChip tone={tone} icon={icon} />
            <Drawer.Title className="font-display text-lg font-bold text-ink">
              {title}
            </Drawer.Title>
          </div>
          <div className="flex flex-col gap-4 px-5.5 pt-4 pb-2">{children}</div>
          {footer ? (
            <div className="px-5.5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
