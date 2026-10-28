const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const CONNECTION_MESSAGE = 'No se pudo conectar con el servidor. Espera un momento y vuelve a intentarlo.';
const CONFIRMATION_MESSAGE = 'No se pudo confirmar la respuesta del servidor. Espera un momento y comprueba el resultado antes de volver a intentarlo.';

function isJsonResponse(response: Response) {
  return /\bapplication\/(?:[\w.-]+\+)?json\b/i.test(response.headers.get('content-type') ?? '');
}

// HTML error pages from the hosting provider must never reach JSON.parse in the UI.
export async function readDriverBody(response: Response): Promise<any> {
  if (response.status === 204) return null;
  if (!isJsonResponse(response)) throw new Error(CONNECTION_MESSAGE);
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(CONNECTION_MESSAGE);
  }
}

type TransportOptions = {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  startupTimeoutMs?: number;
  probeTimeoutMs?: number;
  retryIntervalMs?: number;
  readyCacheMs?: number;
};

export function createApiTransport(apiBase: string, options: TransportOptions = {}) {
  const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const startupTimeoutMs = options.startupTimeoutMs ?? 180_000;
  const probeTimeoutMs = options.probeTimeoutMs ?? 10_000;
  const retryIntervalMs = options.retryIntervalMs ?? 2_000;
  const readyCacheMs = options.readyCacheMs ?? 15_000;
  let readyUntil = 0;
  let readiness: Promise<void> | null = null;

  async function waitUntilReady() {
    if (now() < readyUntil) return;
    if (readiness) return readiness;

    // Only this idempotent health check is retried while a free server wakes up.
    // Concurrent driver/profile requests share the same startup wait.
    readiness = (async () => {
      const deadline = now() + startupTimeoutMs;
      while (now() < deadline) {
        try {
          const response = await send(`${apiBase}/health`, {
            credentials: 'include',
            cache: 'no-store',
            signal: AbortSignal.timeout(Math.max(1, Math.min(probeTimeoutMs, deadline - now()))),
          });
          const body = await readDriverBody(response);
          if (response.ok && body?.ok === true) {
            readyUntil = now() + readyCacheMs;
            return;
          }
        } catch {
          // Render can return HTML (including HTTP 200) until the API is ready.
        }
        const remaining = deadline - now();
        if (remaining > 0) await sleep(Math.min(retryIntervalMs, remaining));
      }
      throw new Error(CONNECTION_MESSAGE);
    })().finally(() => { readiness = null; });

    return readiness;
  }

  return async function fetchDriverResponse(path: string, init: RequestInit = {}) {
    init.signal?.throwIfAborted();
    await waitUntilReady();
    init.signal?.throwIfAborted();
    try {
      // Send the requested operation once: an uncertain response must not duplicate a change.
      const response = await send(`${apiBase}${path}`, { credentials: 'include', cache: 'no-store', ...init });
      if (response.status !== 204 && !isJsonResponse(response)) throw new Error(CONNECTION_MESSAGE);
      return response;
    } catch (error) {
      readyUntil = 0;
      if (init.signal?.aborted) throw error;
      const method = (init.method ?? 'GET').toUpperCase();
      throw new Error(['GET', 'HEAD'].includes(method) ? CONNECTION_MESSAGE : CONFIRMATION_MESSAGE);
    }
  };
}

export const fetchDriverResponse = createApiTransport(API_BASE);
