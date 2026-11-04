import { api } from "@/lib/api";
import { SW_PATH } from "@/lib/push";

type Deps = {
  /** Endpoint de push deste aparelho, ou `null` se ele não está inscrito. */
  endpoint: () => Promise<string | null>;
  post: (body: { endsAt: number; endpoint: string }) => Promise<void>;
  del: () => Promise<void>;
};

/** Cliente do alarme de fim do descanso.
 *
 *  Workaround declarado: erro aqui só vai para o console. O descanso no app não pode
 *  quebrar por falha de rede, e o bipe dentro do app continua valendo. */
export function createRestAlarmClient(deps: Deps) {
  // Fila: cada chamada só sai depois da anterior terminar. Sem ela, "Pular" logo
  // depois de concluir a série manda o DELETE enquanto o POST ainda está em voo —
  // o DELETE não acha nada, o POST grava depois, e o push do descanso pulado chega.
  // A guarda por `messageId` no servidor só vale se a ordem de chegada for a do app.
  let queue: Promise<void> = Promise.resolve();

  const run = (label: string, op: () => Promise<void>) => {
    queue = queue.then(async () => {
      try {
        await op();
      } catch (error) {
        console.warn(`[rest-alarm] não foi possível ${label} o aviso`, error);
      }
    });
    return queue;
  };

  return {
    /** Agenda (ou reajusta) o push de fim do descanso para este aparelho. */
    schedule: (endsAt: number) =>
      run("agendar", async () => {
        const endpoint = await deps.endpoint();
        if (endpoint) await deps.post({ endsAt, endpoint });
      }),
    /** Descanso pulado ou sessão concluída: o push agendado não deve chegar. */
    cancel: () => run("cancelar", deps.del),
  };
}

async function deviceEndpoint(): Promise<string | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

const client = createRestAlarmClient({
  endpoint: deviceEndpoint,
  post: (body) => api.post("/api/rest-alarm", body),
  del: () => api.del("/api/rest-alarm"),
});

export const scheduleRestAlarm = client.schedule;
export const cancelRestAlarm = client.cancel;
