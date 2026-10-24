const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiTransport, readAdminBody } = require('../apps/admin-web/app/lib/apiTransport.ts');

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const html = (status = 502) => new Response('<!DOCTYPE html><title>Starting</title>', { status, headers: { 'content-type': 'text/html' } });

function setup(handler, options = {}) {
  let clock = 1000;
  const calls = [];
  const request = createApiTransport('/proxy/api', {
    fetch: async (url, init) => { calls.push({ url, init }); return handler(url, init); },
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    startupTimeoutMs: 100,
    retryIntervalMs: 10,
    ...options,
  });
  return { request, calls, advance: (ms) => { clock += ms; } };
}

test('waits through Render 502 and HTTP 200 HTML before sending a login once', async () => {
  const startup = [html(), html(200), json({ ok: true })];
  const { request, calls } = setup((url) => url.endsWith('/health') ? startup.shift() : json({ user: { id: 'demo' } }));
  const init = { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': 'csrf' }, body: '{"email":"demo@example.com"}' };
  const response = await request('/auth/internal/login', init);
  assert.deepEqual(await readAdminBody(response), { user: { id: 'demo' } });
  assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 3);
  const sent = calls.filter(({ url }) => !url.endsWith('/health'));
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].init, { credentials: 'include', cache: 'no-store', ...init });
});

test('concurrent page requests share one health probe and later requests recheck after idle', async () => {
  let release;
  const probe = new Promise((resolve) => { release = resolve; });
  const { request, calls, advance } = setup(async (url) => {
    if (url.endsWith('/health')) { await probe; return json({ ok: true }); }
    return json({ items: [] });
  });
  const pending = Promise.all(['/brands', '/cart', '/internal-users'].map((path) => request(path)));
  assert.equal(calls.length, 1);
  release();
  await pending;
  assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 1);
  await request('/products');
  assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 1);
  advance(16_000);
  await request('/products');
  assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 2);
});

test('unavailable or unhealthy API ends with a readable message and never sends the administrative change', async () => {
  const { request, calls } = setup(() => json({ ok: false }, 503));
  await assert.rejects(request('/internal-users', { method: 'POST' }), /No se pudo conectar con el servidor/);
  assert.equal(calls.length, 10);
  assert.ok(calls.every(({ url }) => url.endsWith('/health')));
});

test('a timed-out health probe recovers without repeating the requested operation', async () => {
  let probes = 0;
  const { request, calls } = setup((url) => {
    if (url.endsWith('/health') && probes++ === 0) throw new DOMException('Timed out', 'TimeoutError');
    return json({ ok: true });
  });
  await request('/cart', { method: 'PATCH', body: '{}' });
  assert.equal(probes, 2);
  assert.equal(calls.filter(({ url }) => url.endsWith('/cart')).length, 1);
});

test('preserves JSON authentication and validation errors for the existing session handler', async () => {
  const { request } = setup((url) => url.endsWith('/health') ? json({ ok: true }) : json({ message: 'Credenciales invalidas' }, 401));
  const response = await request('/auth/internal/login', { method: 'POST' });
  assert.equal(response.status, 401);
  assert.equal((await readAdminBody(response)).message, 'Credenciales invalidas');
});

for (const failure of ['html', 'network']) {
  test(`an uncertain ${failure} administrative change response is never retried and invalidates readiness`, async () => {
    const { request, calls } = setup((url) => {
      if (url.endsWith('/health')) return json({ ok: true });
      if (failure === 'network') throw new TypeError('Failed to fetch');
      return html();
    });
    await assert.rejects(request('/internal-users', { method: 'POST', body: '{}' }), /comprueba el resultado/);
    assert.equal(calls.filter(({ url }) => url.endsWith('/internal-users')).length, 1);
    await assert.rejects(request('/internal-users'), /No se pudo conectar/);
    assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 2);
  });
}

test('safe parsing accepts JSON and empty 204 responses, hides HTML and malformed JSON', async () => {
  assert.equal(await readAdminBody(new Response(null, { status: 204 })), null);
  assert.deepEqual(await readAdminBody(json([{ id: 1 }])), [{ id: 1 }]);
  assert.deepEqual(await readAdminBody(new Response('{"message":"invalid"}', { headers: { 'content-type': 'application/problem+json' } })), { message: 'invalid' });
  for (const response of [html(), new Response('<!DOCTYPE html>', { headers: { 'content-type': 'application/json' } })]) {
    await assert.rejects(readAdminBody(response), (error) => !(error instanceof SyntaxError) && /No se pudo conectar/.test(error.message));
  }
});

test('an aborted caller does not send a mutation after a shared startup wait', async () => {
  const controller = new AbortController();
  const { request, calls } = setup(() => { controller.abort(); return json({ ok: true }); });
  await assert.rejects(request('/internal-users', { method: 'POST', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 1);
  await assert.rejects(request('/internal-users', { method: 'POST', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 1);
});

test('admin requests preserve CSRF cookies and refresh an expired session after startup', async () => {
  const originals = { fetch: global.fetch, window: global.window, document: global.document };
  const stored = new Map([['adminUser', JSON.stringify({ id: 'admin', email: 'admin@example.com' })]]);
  global.window = {
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) },
    dispatchEvent: () => {},
  };
  global.document = { cookie: 'admin_csrf=test%20token' };
  const calls = [];
  let attempts = 0;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/health')) return json({ ok: true });
    if (url.endsWith('/auth/internal/refresh')) return json({ user: { id: 'admin', email: 'admin@example.com', roles: ['SUPER_ADMIN'], permissions: [] } });
    if (++attempts === 1) return json({ message: 'Sesion expirada.' }, 401);
    return json({ ok: true });
  };
  try {
    const { adminApiRequest } = require('../apps/admin-web/app/lib/adminApi.ts');
    assert.deepEqual(await adminApiRequest('/internal-users', { method: 'POST', body: '{}' }), { ok: true });
    assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 1);
    assert.equal(calls.filter(({ url }) => url.endsWith('/auth/internal/refresh')).length, 1);
    const mutations = calls.filter(({ url }) => url.endsWith('/internal-users'));
    assert.equal(mutations.length, 2);
    for (const { init } of mutations) {
      assert.equal(init.credentials, 'include');
      assert.equal(init.headers['x-csrf-token'], 'test token');
      assert.equal(init.headers['content-type'], 'application/json');
      assert.equal(init.body, '{}');
    }
    assert.equal(JSON.parse(stored.get('adminUser')).id, 'admin');
  } finally {
    Object.assign(global, originals);
  }
});
