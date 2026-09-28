import http from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BridgeServer } from '../bridge';

const ORIGIN = 'https://readfaster.example';
const TOKEN = 'x'.repeat(32);

function request(port: number, opts: { method?: string; path: string; headers?: Record<string, string>; body?: string; host?: string }) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1', port, method: opts.method ?? 'GET', path: opts.path,
      headers: { host: opts.host ?? `127.0.0.1:${port}`, ...opts.headers },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/** A fake browser tab: subscribes to events and answers commands with `answer`. */
function fakeTab(port: number, answer: (cmd: { type: string }) => unknown) {
  return new Promise<http.ClientRequest>((resolve) => {
    const req = http.get({
      host: '127.0.0.1', port, path: `/events?token=${TOKEN}`,
      headers: { origin: ORIGIN, host: `127.0.0.1:${port}` },
    }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => {
        buf += chunk;
        let i: number;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          const data = block.split('\n').find((l) => l.startsWith('data: '));
          if (!data) continue;
          const env = JSON.parse(data.slice(6));
          const body = JSON.stringify({ id: env.id, ok: true, result: answer(env.command) });
          void request(port, { method: 'POST', path: '/reply', body, headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-readfaster-token': TOKEN } });
        }
      });
      resolve(req);
    });
  });
}

describe('BridgeServer', () => {
  let bridge: BridgeServer;
  let port: number;
  beforeEach(async () => {
    bridge = new BridgeServer({ port: 0, token: TOKEN, allowedOrigins: [ORIGIN] });
    port = await bridge.start();
  });
  afterEach(() => bridge.stop());

  it('rejects other origins, wrong hosts and bad tokens', async () => {
    expect((await request(port, { path: '/health', headers: { origin: 'https://evil.example' } })).status).toBe(403);
    expect((await request(port, { path: '/health' })).status).toBe(403);
    expect((await request(port, { path: '/health', headers: { origin: ORIGIN }, host: 'evil.example' })).status).toBe(403);
    expect((await request(port, { path: '/events?token=wrong', headers: { origin: ORIGIN } })).status).toBe(401);
    expect((await request(port, { method: 'POST', path: '/reply', body: '{}', headers: { origin: ORIGIN } })).status).toBe(401);
  });

  it('answers CORS preflight for the app origin', async () => {
    const r = await request(port, { method: 'OPTIONS', path: '/reply', headers: { origin: ORIGIN } });
    expect(r.status).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(r.headers['access-control-allow-headers']).toContain('x-readfaster-token');
  });

  it('round-trips a command to a connected tab', async () => {
    expect(bridge.connected).toBe(false);
    const waiting = bridge.waitForClient(2000);
    const tab = await fakeTab(port, (cmd) => ({ echo: cmd.type }));
    expect(await waiting).toBe(true);
    await expect(bridge.send({ type: 'get_state' })).resolves.toEqual({ echo: 'get_state' });
    tab.destroy();
  });

  it('fails fast with no tab and times out when a tab never answers', async () => {
    await expect(bridge.send({ type: 'get_state' })).rejects.toThrow(/not open/);
    expect(await bridge.waitForClient(50)).toBe(false);
    const silent = await new Promise<http.ClientRequest>((resolve) => {
      const req = http.get({ host: '127.0.0.1', port, path: `/events?token=${TOKEN}`, headers: { origin: ORIGIN } }, () => resolve(req));
    });
    await expect(bridge.send({ type: 'get_state' }, 100)).rejects.toThrow(/did not respond/);
    silent.destroy();
  });

  it('moves to the next port when the preferred one is taken', async () => {
    const other = new BridgeServer({ port, token: TOKEN, allowedOrigins: [ORIGIN], range: 5 });
    const p = await other.start();
    expect(p).toBeGreaterThan(port);
    await other.stop();
  });
});
