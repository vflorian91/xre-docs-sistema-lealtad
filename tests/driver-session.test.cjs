const { test } = require('node:test');
const assert = require('node:assert/strict');
const argon2 = require('argon2');
const { JwtService } = require('@nestjs/jwt');
const { DriverAuthService } = require('../apps/api/src/modules/driver/driver-auth.service.ts');
const { DriverAuthController } = require('../apps/api/src/modules/driver/driver-auth.controller.ts');
const accessSecret = 'test-access-secret', refreshSecret = 'test-refresh-secret';

for (const rememberMe of [false, true]) {
  test(`driver refresh preserves ${rememberMe ? 'persistent' : 'browser-session'} cookie duration`, async () => {
    const cookies = [];
    const reply = { setCookie(name, value, options) { cookies.push({ name, options }); return reply; } };
    const service = { refresh: async token => { assert.equal(token, 'refresh'); return { accessToken: 'access', refreshToken: 'rotated', driver: { id: 'driver' } }; } };
    const controller = new DriverAuthController(service, { get: () => undefined });
    assert.deepEqual(await controller.refresh({ rememberMe }, { cookies: { driver_rt: 'refresh' }, headers: {} }, reply), { driver: { id: 'driver' } });
    assert.equal(cookies.length, 3);
    for (const cookie of cookies) assert.equal(Boolean(cookie.options.maxAge), rememberMe);
    assert.equal(cookies.find(cookie => cookie.name === 'driver_rt').options.httpOnly, true);
    assert.equal(cookies.find(cookie => cookie.name === 'driver_csrf').options.httpOnly, false);
  });
}

test('driver refresh clears cookies when the refresh token is absent', async () => {
  const cleared = [];
  const reply = { clearCookie(name) { cleared.push(name); return reply; } };
  const controller = new DriverAuthController({ refresh: () => assert.fail('No token must not issue access') }, { get: () => undefined });
  await assert.rejects(controller.refresh({}, { cookies: {}, headers: {} }, reply), /expirada/);
  assert.deepEqual(cleared, ['driver_at', 'driver_rt', 'driver_csrf']);
});

async function fixture(overrides = {}, payloadOverrides = {}) {
  const jwt = new JwtService();
  const token = await jwt.signAsync({ sub: 'driver', sessionId: 'session', type: 'driver_refresh', ...payloadOverrides }, { secret: refreshSecret, expiresIn: '30d', jwtid: 'previous' });
  const state = { id: 'session', driverId: 'driver', revokedAt: null, expiresAt: new Date(Date.now() + 86400000), refreshTokenHash: await argon2.hash(token), driver: { id: 'driver', fullName: 'Test Driver', phone: '50000000', isActive: true, accessStatus: 'ACTIVO', mustChangePassword: false }, ...overrides };
  const updates = [];
  const prisma = { storeDriverSession: { findUnique: async () => state, update: async ({ data }) => { updates.push(data); Object.assign(state, data); return state; } } };
  const config = { get: () => undefined, getOrThrow: key => key === 'JWT_ACCESS_SECRET' ? accessSecret : refreshSecret };
  return { service: new DriverAuthService(prisma, jwt, config), jwt, token, state, updates };
}

test('driver renewal validates the refresh session and rotates tokens without changing the driver', async () => {
  const f = await fixture();
  const result = await f.service.refresh(f.token, { ip: '127.0.0.1', headers: {} });
  assert.equal(result.driver.id, 'driver');
  assert.equal(result.driver.sessionId, 'session');
  assert.equal(result.driver.accessStatus, 'ACTIVO');
  assert.equal((await f.jwt.verifyAsync(result.accessToken, { secret: accessSecret })).type, 'driver');
  assert.equal((await f.jwt.verifyAsync(result.refreshToken, { secret: refreshSecret })).type, 'driver_refresh');
  assert.notEqual(result.refreshToken, f.token);
  assert.ok(await argon2.verify(f.state.refreshTokenHash, result.refreshToken));
  const second = await f.service.refresh(result.refreshToken, { headers: {} });
  assert.notEqual(second.refreshToken, result.refreshToken);
  await assert.rejects(f.service.refresh(f.token, { headers: {} }), /invalida/);
  assert.ok(f.state.revokedAt);
});

for (const [name, state, payload] of [
  ['another role', {}, { type: 'customer_refresh' }],
  ['another driver', {}, { sub: 'other-driver' }],
  ['revoked session', { revokedAt: new Date() }, {}],
  ['expired session', { expiresAt: new Date(0) }, {}],
  ['inactive driver', { driver: { id: 'driver', isActive: false, accessStatus: 'ACTIVO' } }, {}],
  ['blocked driver', { driver: { id: 'driver', isActive: true, accessStatus: 'BLOQUEADO' } }, {}],
]) {
  test(`driver renewal rejects ${name} without issuing tokens`, async () => {
    const f = await fixture(state, payload);
    await assert.rejects(f.service.refresh(f.token, { headers: {} }));
    assert.equal(f.updates.length, 0);
  });
}

test('driver renewal rejects a tampered signature', async () => {
  const f = await fixture();
  await assert.rejects(f.service.refresh(f.token + 'tampered', { headers: {} }), /expirada/);
  assert.equal(f.updates.length, 0);
});

test('driver requests share renewal, keep remember-me, and rebuild CSRF headers on an authenticated retry', async () => {
  const original = { fetch: global.fetch, window: global.window, document: global.document };
  const local = new Map([['driverUser', JSON.stringify({ id: 'driver' })]]), session = new Map();
  const storage = map => ({ getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  global.window = { localStorage: storage(local), sessionStorage: storage(session) };
  global.document = { cookie: 'driver_csrf=before' };
  const calls = [], attempts = new Map();
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/health')) return json({ ok: true });
    if (url.endsWith('/driver/auth/refresh')) {
      await new Promise(resolve => setImmediate(resolve));
      global.document.cookie = 'driver_csrf=after';
      return json({ driver: { id: 'driver', fullName: 'Driver' } });
    }
    const count = (attempts.get(url) ?? 0) + 1; attempts.set(url, count);
    return count === 1 ? json({ message: 'Expirada' }, 401) : json({ ok: true });
  };
  try {
    const { driverApiRequest } = require('../apps/driver-pwa/app/lib/driverApi.ts');
    await Promise.all(['/driver/profile', '/driver/dashboard', '/driver/deliveries/demo'].map(route => driverApiRequest(route, { method: 'PATCH', body: '{}' })));
    const refreshes = calls.filter(call => call.url.endsWith('/driver/auth/refresh'));
    assert.equal(refreshes.length, 1);
    assert.deepEqual(JSON.parse(refreshes[0].init.body), { rememberMe: true });
    assert.equal(JSON.parse(local.get('driverUser')).id, 'driver');
    assert.equal(session.size, 0);
    assert.equal(calls.filter(call => call.init.headers?.['x-csrf-token'] === 'after').length, 3);
    assert.ok([...attempts.values()].every(count => count === 2));
    global.fetch = async url => json({ message: 'Servidor temporalmente no disponible' }, url.endsWith('/driver/auth/refresh') ? 503 : 401);
    await assert.rejects(driverApiRequest('/driver/profile'), /temporalmente/);
    assert.ok(local.has('driverUser'));
    global.fetch = async url => json({ message: 'Sesion expirada' }, 401);
    await assert.rejects(driverApiRequest('/driver/profile'), /expirada/);
    assert.equal(local.size, 0);
    assert.equal(session.size, 0);
  } finally { Object.assign(global, original); }
});
