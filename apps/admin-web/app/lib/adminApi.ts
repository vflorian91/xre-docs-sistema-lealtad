export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type StoredAdminUser = {
  id: string;
  email: string;
  fullName: string;
  profilePhotoUrl?: string | null;
  roles: string[];
  permissions: string[];
  storeIds?: string[];
  stores?: Array<{ id: string; code: string; name: string }>;
  activeStoreId?: string;
  sessionId?: string;
  mustChangePassword?: boolean;
};

type InternalAuthResponse = {
  user: StoredAdminUser;
};

let refreshPromise: Promise<void> | null = null;

export function getStoredAdminUser() {
  if (typeof window === 'undefined') return null;
  const storedUser = window.localStorage.getItem('adminUser');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as StoredAdminUser;
  } catch {
    return null;
  }
}

export function hasAdminSession() {
  return Boolean(getStoredAdminUser());
}

export function setAdminSession(result: InternalAuthResponse) {
  setStoredAdminUser(result.user);
}

export function setStoredAdminUser(user: StoredAdminUser) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('adminUser', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('adminUserUpdated', { detail: user }));
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('adminUser');
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function refreshAdminSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = refreshAdminSessionOnce().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function refreshAdminSessionOnce() {
  let response: Response;
  let body: unknown;

  try {
    response = await fetch(`${API_BASE}/auth/internal/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    body = await readJsonResponse(response);
  } catch (networkError) {
    throw new Error(translateNetworkError(networkError));
  }

  if (!response.ok) {
    clearAdminSession();
    throw new Error(getApiErrorText(body, 'Sesion expirada. Ingresa nuevamente.'));
  }

  setAdminSession(body as InternalAuthResponse);
}

export async function adminApiRequest<T>(path: string, options: RequestInit = {}) {
  let response: Response;
  let body: unknown;

  try {
    response = await fetchAdmin(path, options);
    body = await readJsonResponse(response);
  } catch (networkError) {
    throw new Error(translateNetworkError(networkError));
  }

  if (response.status === 401 && hasAdminSession()) {
    try {
      await refreshAdminSession();
      response = await fetchAdmin(path, options);
      body = await readJsonResponse(response);
    } catch (networkError) {
      throw new Error(translateNetworkError(networkError));
    }
  }

  if (!response.ok) {
    throw new Error(getApiErrorText(body, 'No se pudo completar la accion.'));
  }

  return body as T;
}

function fetchAdmin(path: string, options: RequestInit) {
  const method = (options.method ?? 'GET').toUpperCase();
  const csrfToken = getCookieValue('admin_csrf');

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(MUTATING_METHODS.has(method) && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...options.headers,
    },
  });
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function getApiErrorText(body: unknown, fallback: string) {
  const candidate = body as { issues?: Array<{ message: string }>; message?: string } | null;
  const issueText = candidate?.issues?.map((issue) => issue.message).join(' ');
  return issueText || candidate?.message || fallback;
}

export function getErrorText(error: unknown, fallback = 'No se pudo completar la accion.') {
  if (error instanceof Error) {
    return translateNetworkError(error) !== error.message ? translateNetworkError(error) : error.message;
  }
  return fallback;
}

function translateNetworkError(error: unknown): string {
  if (!(error instanceof Error)) return 'No se pudo completar la accion.';
  const msg = error.message.toLowerCase();
  if (msg.includes('failed to fetch') || msg.includes('network request failed') || msg.includes('networkerror') || msg.includes('the network connection was lost') || msg.includes('unable to connect')) {
    return 'No se pudo conectar con el servidor. Verifica tu conexion a internet o intenta nuevamente.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'La solicitud tardo demasiado tiempo. Intenta nuevamente.';
  }
  if (msg.includes('aborted') || msg.includes('abort')) {
    return 'La solicitud fue cancelada. Intenta nuevamente.';
  }
  return error.message;
}

export function absoluteMediaUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_BASE.replace(/\/api$/, '')}${value}`;
}

// Carga una imagen ya guardada como File para poder reencuadrarla (recorte) y re-subirla.
export async function fetchImageAsFile(url: string, filename = 'imagen.png'): Promise<File> {
  const response = await fetch(absoluteMediaUrl(url), { credentials: 'include' });
  if (!response.ok) throw new Error('No se pudo cargar la imagen actual para reencuadrar.');
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export async function readFileAsBase64(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
}
