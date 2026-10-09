import assert from 'node:assert/strict';
import test from 'node:test';
import { FastifyRequest } from 'fastify';
import { assertCsrfTokenMatches } from '../src/modules/auth/cookie.util';
import { CustomerAuthUser } from '../src/modules/auth/auth.types';
import { RewardsService } from '../src/modules/rewards/rewards.service';

function request(input: { method?: string; cookies?: Record<string, string>; headers?: Record<string, string> }) {
  return {
    method: input.method ?? 'POST',
    cookies: input.cookies ?? {},
    headers: input.headers ?? {},
  } as unknown as FastifyRequest;
}

test('cookie session requires its matching CSRF token', () => {
  assert.doesNotThrow(() => assertCsrfTokenMatches(request({
    cookies: { admin_at: 'jwt', admin_csrf: 'token-a' },
    headers: { 'x-csrf-token': 'token-a' },
  }), 'admin'));

  assert.throws(() => assertCsrfTokenMatches(request({
    cookies: { admin_at: 'jwt' },
  }), 'admin'));
});

test('admin and client CSRF cookies do not authorize each other', () => {
  assert.throws(() => assertCsrfTokenMatches(request({
    cookies: { admin_at: 'jwt', client_csrf: 'client-token' },
    headers: { 'x-csrf-token': 'client-token' },
  }), 'admin'));
});

test('Bearer authentication does not require CSRF', () => {
  assert.doesNotThrow(() => assertCsrfTokenMatches(request({
    headers: { authorization: 'Bearer jwt' },
  }), 'admin'));
});

const customer = (brandItemId: string | null): CustomerAuthUser => ({
  id: 'customer-1',
  code: 'RMT-000001',
  fullName: 'Cliente Prueba',
  phone: '55554444',
  status: 'ACTIVE',
  brandItemId,
  sessionId: 'session-1',
  mustChangePassword: false,
});

test('customer without brand only receives global rewards', async () => {
  let capturedWhere: unknown;
  const prisma = {
    redeemableProduct: {
      findMany: async (input: { where: unknown }) => {
        capturedWhere = input.where;
        return [];
      },
    },
  };
  const service = new RewardsService(prisma as never, {} as never);

  await service.listPublic(customer(null));

  const brandFilter = (capturedWhere as { AND: Array<{ OR: unknown[] }> }).AND[2];
  assert.deepEqual(brandFilter.OR, [{ brandItemId: null }]);
});

test('customer with brand receives global and matching brand rewards', async () => {
  let capturedWhere: unknown;
  const prisma = {
    redeemableProduct: {
      findMany: async (input: { where: unknown }) => {
        capturedWhere = input.where;
        return [];
      },
    },
  };
  const service = new RewardsService(prisma as never, {} as never);

  await service.listPublic(customer('brand-1'));

  const brandFilter = (capturedWhere as { AND: Array<{ OR: unknown[] }> }).AND[2];
  assert.deepEqual(brandFilter.OR, [{ brandItemId: null }, { brandItemId: 'brand-1' }]);
});
