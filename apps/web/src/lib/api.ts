export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const LOGIN_PATH = "/login";

/**
 * 401 significa sessão ausente ou expirada: o cookie pode continuar no browser,
 * então sem isso a tela fica logada por fora e todas as chamadas falham. Manda
 * pro login guardando a rota atual em `?next=`.
 */
function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === LOGIN_PATH) return;
  const next = window.location.pathname + window.location.search;
  window.location.replace(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    redirectToLogin();
    // A navegação não interrompe este tick: rejeitar evita a tela seguir com dados vazios.
    throw new ApiError(401, "sessão expirada");
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON body: keep statusText */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  return fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((res) => handle<T>(res));
}

function upload<T>(path: string, form: FormData): Promise<T> {
  // sem content-type manual: o browser define o boundary do multipart.
  return fetch(path, { method: "POST", credentials: "same-origin", body: form }).then((res) =>
    handle<T>(res),
  );
}

export const api = {
  get: <T>(path: string) => request<T>(path, "GET"),
  post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body),
  put: <T>(path: string, body?: unknown) => request<T>(path, "PUT", body),
  patch: <T>(path: string, body?: unknown) => request<T>(path, "PATCH", body),
  del: <T>(path: string, body?: unknown) => request<T>(path, "DELETE", body),
  upload: <T>(path: string, form: FormData) => upload<T>(path, form),
};
