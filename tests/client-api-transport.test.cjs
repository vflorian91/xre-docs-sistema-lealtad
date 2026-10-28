const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApiTransport, readApiBody } = require('../apps/client-pwa/app/lib/apiTransport.ts');

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
  const { request, calls } = setup((url) => url.endsWith('/health') ? startup.shift() : json({ customer: { id: 'demo' } }));
  const init = { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': 'csrf' }, body: '{"email":"demo@example.com"}' };
  const response = await request('/auth/customer/login', init);
  assert.deepEqual(await readApiBody(response), { customer: { id: 'demo' } });
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
  const pending = Promise.all(['/brands', '/cart', '/orders'].map((path) => request(path)));
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

test('unavailable or unhealthy API ends with a readable message and never sends the order', async () => {
  const { request, calls } = setup(() => json({ ok: false }, 503));
  await assert.rejects(request('/orders', { method: 'POST' }), /No se pudo conectar con la tienda/);
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
  const response = await request('/auth/customer/login', { method: 'POST' });
  assert.equal(response.status, 401);
  assert.equal((await readApiBody(response)).message, 'Credenciales invalidas');
});

for (const failure of ['html', 'network']) {
  test(`an uncertain ${failure} order response is never retried and invalidates readiness`, async () => {
    const { request, calls } = setup((url) => {
      if (url.endsWith('/health')) return json({ ok: true });
      if (failure === 'network') throw new TypeError('Failed to fetch');
      return html();
    });
    await assert.rejects(request('/orders', { method: 'POST', body: '{}' }), /revisa tus pedidos/);
    assert.equal(calls.filter(({ url }) => url.endsWith('/orders')).length, 1);
    await assert.rejects(request('/orders'), /No se pudo conectar/);
    assert.equal(calls.filter(({ url }) => url.endsWith('/health')).length, 2);
  });
}

test('safe parsing accepts JSON and empty 204 responses, hides HTML and malformed JSON', async () => {
  assert.equal(await readApiBody(new Response(null, { status: 204 })), null);
  assert.deepEqual(await readApiBody(json([{ id: 1 }])), [{ id: 1 }]);
  assert.deepEqual(await readApiBody(new Response('{"message":"invalid"}', { headers: { 'content-type': 'application/problem+json' } })), { message: 'invalid' });
  for (const response of [html(), new Response('<!DOCTYPE html>', { headers: { 'content-type': 'application/json' } })]) {
    await assert.rejects(readApiBody(response), (error) => !(error instanceof SyntaxError) && /No se pudo conectar/.test(error.message));
  }
});

test('an aborted caller does not send a mutation after a shared startup wait', async () => {
  const controller = new AbortController();
  const { request, calls } = setup(() => { controller.abort(); return json({ ok: true }); });
  await assert.rejects(request('/orders', { method: 'POST', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 1);
  await assert.rejects(request('/orders', { method: 'POST', signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 1);
});


test('allows a cold startup longer than ninety seconds before sending login once', async () => {
  let probes = 0;
  const fixture = setup((url) => {
    if (url.endsWith('/health') && probes++ === 0) {
      fixture.advance(95_000);
      return html();
    }
    return json({ ok: true });
  }, { startupTimeoutMs: undefined });
  await fixture.request('/login', { method: 'POST', body: '{}' });
  assert.equal(fixture.calls.filter(({ url }) => url.endsWith('/login')).length, 1);
  assert.equal(probes, 2);
});
