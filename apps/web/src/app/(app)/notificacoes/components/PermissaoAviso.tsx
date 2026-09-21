"use client";

import { BellSlashIcon } from "@phosphor-icons/react";

import { IconChip } from "@/components/icon-chip";
import type { PushStatus } from "@/lib/push";

/** Texto por estado. `granted` e `default` não aparecem: um está resolvido e o outro
 *  ainda não foi perguntado — avisar antes da intenção seria pedir permissão na porta.
 *  `unconfigured` também some: é falta de chave VAPID no ambiente, problema de
 *  operação, e não há nada que a pessoa possa fazer a respeito. */
const AVISO: Partial<Record<PushStatus, { title: string; body: string }>> = {
  denied: {
    title: "As notificações estão bloqueadas",
    body: "Suas preferências ficam salvas aqui. Para receber, libere as notificações do Bloomy nas configurações do aparelho: mantenha o ícone do app pressionado → Informações do app → Notificações.",
  },
  unsupported: {
    title: "Este navegador não recebe lembretes",
    body: "Suas preferências ficam salvas. No Android, instale o Bloomy na tela de início pelo Chrome para receber as notificações.",
  },
};

export function PermissaoAviso({ status }: { status: PushStatus }) {
  const aviso = AVISO[status];
  if (!aviso) return null;

  return (
    <div className="flex items-start gap-3 rounded-card bg-coral-tint p-4">
      <IconChip
        tone="coral"
        icon={<BellSlashIcon size={18} weight="fill" />}
        variant="white"
        size="md"
      />
      <span className="flex flex-col gap-1">
        <span className="font-display text-sm font-bold text-coral">{aviso.title}</span>
        <span className="text-xs font-semibold text-coral">{aviso.body}</span>
      </span>
    </div>
  );
}
