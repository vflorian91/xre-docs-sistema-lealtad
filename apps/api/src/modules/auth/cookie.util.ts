import { randomBytes } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';

type ReplyWithCookies = FastifyReply & {
  setCookie(name: string, value: string, options?: Record<string, unknown>): FastifyReply;
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply;
};

type RequestWithCookies = FastifyRequest & { cookies?: Record<string, string | undefined> };

export const CSRF_HEADER_NAME = 'x-csrf-token';

// Independiente de APP_ENV: APP_ENV=production solo indica "entorno desplegado",
// no que haya TLS real al frente. Las cookies Secure se pierden silenciosamente
// si el navegador no esta sobre HTTPS, asi que esto se controla aparte.
const SECURE_COOKIES = process.env.COOKIE_SECURE === 'true';

export type AuthCookiePrefix = 'admin' | 'client' | 'driver';

function accessCookieName(prefix: AuthCookiePrefix) {
  return `${prefix}_at`;
}

function refreshCookieName(prefix: AuthCookiePrefix) {
  return `${prefix}_rt`;
}

function csrfCookieName(prefix: AuthCookiePrefix) {
  return `${prefix}_csrf`;
}

export function generateCsrfToken() {
  return randomBytes(24).toString('hex');
}

const DURATION_UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

export function parseDurationToSeconds(value: string | undefined, fallbackSeconds: number) {
  if (!value) return fallbackSeconds;
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackSeconds;
  return Number(match[1]) * DURATION_UNIT_SECONDS[match[2]];
}

export function setAuthCookies(
  baseReply: FastifyReply,
  prefix: AuthCookiePrefix,
  tokens: { accessToken: string; refreshToken: string },
  options: { accessMaxAgeSeconds?: number; refreshMaxAgeSeconds?: number },
) {
  const base = {
    httpOnly: true,
    secure: SECURE_COOKIES,
    sameSite: 'lax' as const,
    path: '/',
  };

  const reply = baseReply as ReplyWithCookies;
  reply.setCookie(accessCookieName(prefix), tokens.accessToken, {
    ...base,
    ...(options.accessMaxAgeSeconds ? { maxAge: options.accessMaxAgeSeconds } : {}),
  });
  reply.setCookie(refreshCookieName(prefix), tokens.refreshToken, {
    ...base,
    ...(options.refreshMaxAgeSeconds ? { maxAge: options.refreshMaxAgeSeconds } : {}),
  });
  reply.setCookie(csrfCookieName(prefix), generateCsrfToken(), {
    httpOnly: false,
    secure: SECURE_COOKIES,
    sameSite: 'lax',
    path: '/',
    ...(options.refreshMaxAgeSeconds ? { maxAge: options.refreshMaxAgeSeconds } : {}),
  });
}

export function clearAuthCookies(baseReply: FastifyReply, prefix: AuthCookiePrefix) {
  const reply = baseReply as ReplyWithCookies;
  const base = { path: '/' };
  reply.clearCookie(accessCookieName(prefix), base);
  reply.clearCookie(refreshCookieName(prefix), base);
  reply.clearCookie(csrfCookieName(prefix), base);
}

export function getAccessTokenFromRequest(baseRequest: FastifyRequest, prefix: AuthCookiePrefix) {
  const request = baseRequest as RequestWithCookies;
  const fromCookie = request.cookies?.[accessCookieName(prefix)];
  if (fromCookie) return fromCookie;

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return undefined;
}

export function getRefreshTokenFromRequest(baseRequest: FastifyRequest, prefix: AuthCookiePrefix, bodyToken?: string) {
  const request = baseRequest as RequestWithCookies;
  const fromCookie = request.cookies?.[refreshCookieName(prefix)];
  return fromCookie ?? bodyToken;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function assertCsrfTokenMatches(baseRequest: FastifyRequest, prefix: AuthCookiePrefix) {
  const request = baseRequest as RequestWithCookies;
  if (!MUTATING_METHODS.has(request.method)) return;

  const usesCookieSession = Boolean(request.cookies?.[accessCookieName(prefix)]);
  if (!usesCookieSession) return; // El flujo Authorization: Bearer no depende de cookies y no requiere CSRF.

  const cookieToken = request.cookies?.[csrfCookieName(prefix)];

  const headerToken = request.headers[CSRF_HEADER_NAME];
  if (!cookieToken || !headerToken || headerToken !== cookieToken) {
    throw new Error('CSRF_TOKEN_MISMATCH');
  }
}
