/** Texto de cada notificação e a tela que ela abre.
 *
 *  Tom do produto: gentil e curto, sem cobrança — o mesmo do check-in da mente
 *  ("às 21h, sem cobrança"). Módulo puro, sem banco: só formata. */

import type { DueSlot } from "./slots";

export type Notification = {
  title: string;
  body: string;
  /** Deep link que o service worker abre no clique. */
  url: string;
  /** Agrupa notificações do mesmo tipo na bandeja em vez de empilhar. */
  tag: string;
};

export function notificationFor(slot: DueSlot): Notification {
  switch (slot.type) {
    case "water":
      return {
        title: "Hora da água 💧",
        body: "Um copo agora te deixa mais perto da meta.",
        url: "/home",
        tag: "water",
      };

    case "meds": {
      const n = slot.count ?? 1;
      return {
        title: "Hora do remédio",
        body: n === 1 ? "1 pra tomar agora." : `${n} pra tomar agora.`,
        url: "/saude",
        tag: "meds",
      };
    }

    case "workout":
      return {
        title: "Seu treino te espera",
        body: "Bora mexer o corpo?",
        url: "/treino",
        tag: "workout",
      };

    case "mind":
      return {
        title: "Como foi seu dia?",
        body: "Um check-in rápido, sem cobrança.",
        url: "/mente",
        tag: "mind",
      };

    case "appointments": {
      // O refId carrega o tipo de aviso no sufixo (`:1d` ou `:1h`) — ver `slots.ts`.
      const dayBefore = slot.refId.endsWith(":1d");
      const what = slot.refId.startsWith("exam:") ? "Exame" : "Consulta";
      const when = dayBefore ? "amanhã" : "em 1 hora";
      return {
        title: `${what} ${when}`,
        body: slot.label
          ? `${slot.label} às ${slot.slot}.`
          : `Não esqueça: ${when}.`,
        url: "/saude",
        // Uma tag por evento: dois compromissos no mesmo dia não se sobrescrevem.
        tag: slot.refId,
      };
    }
  }
}
