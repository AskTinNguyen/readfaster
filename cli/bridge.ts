/**
 * Local bridge between the MCP server and the ReadFaster tab in the user's
 * browser. Listens on 127.0.0.1 only. The app subscribes to commands with
 * Server-Sent Events and POSTs replies.
 *
 * Every request must come from an allowed origin, name the loopback host
 * (blocks DNS rebinding) and carry the pairing token.
 */
import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { TOKEN_HEADER, type BridgeCommand, type BridgeReply } from '../src/lib/protocol';

export interface BridgeOptions {
  port: number;
  token: string;
  allowedOrigins: string[];
  /** How many consecutive ports to try if `port` is taken. */
  range?: number;
  log?: (msg: string) => void;
}

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

const MAX_BODY = 1_000_000;

export class BridgeServer {
  port = 0;
  private server?: http.Server;
  private clients: http.ServerResponse[] = [];
  private pending = new Map<string, Pending>();
  private waiters = new Set<() => void>();
  private allowed: Set<string>;

  constructor(private opts: BridgeOptions) {
    this.allowed = new Set(opts.allowedOrigins.map((o) => o.replace(/\/+$/, '')));
  }

  get token() {
    return this.opts.token;
  }

  get connected(): boolean {
    return this.clients.length > 0;
  }

  async start(): Promise<number> {
    const range = this.opts.range ?? 1;
    let lastErr: unknown;
    for (let p = this.opts.port; p < this.opts.port + range; p++) {
      const server = http.createServer((req, res) => this.handle(req, res));
      try {
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          server.listen(p, '127.0.0.1', () => resolve());
        });
        this.server = server;
        this.port = (server.address() as { port: number }).port;
        return this.port;
      } catch (e) {
        lastErr = e;
        if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE') break;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Could not start the agent bridge');
  }

  async stop() {
    for (const c of this.clients) c.end();
    this.clients = [];
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Bridge stopped'));
    }
    this.pending.clear();
    await new Promise<void>((r) => (this.server ? this.server.close(() => r()) : r()));
  }

  /** Resolves true as soon as a tab connects, false after `ms`. */
  waitForClient(ms: number): Promise<boolean> {
    if (this.connected) return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (v: boolean) => {
        clearTimeout(timer);
        this.waiters.delete(onConnect);
        resolve(v);
      };
      const onConnect = () => done(true);
      const timer = setTimeout(() => done(false), ms);
      this.waiters.add(onConnect);
    });
  }

  /** Sends a command to the most recently connected tab and waits for its reply. */
  send(command: BridgeCommand, timeoutMs = 15000): Promise<unknown> {
    const client = this.clients[this.clients.length - 1];
    if (!client) return Promise.reject(new Error('ReadFaster is not open in a browser'));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('ReadFaster did not respond in time. Is the tab still open?'));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      client.write(`data: ${JSON.stringify({ id, command })}\n\n`);
    });
  }

  private tokenOk(given: string | null | undefined): boolean {
    if (!given) return false;
    const a = Buffer.from(given);
    const b = Buffer.from(this.opts.token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const host = req.headers.host ?? '';
    if (host !== `127.0.0.1:${this.port}` && host !== `localhost:${this.port}`) {
      res.writeHead(403).end();
      return;
    }
    const origin = (req.headers.origin ?? '').replace(/\/+$/, '');
    if (!origin || !this.allowed.has(origin)) {
      res.writeHead(403, { 'content-type': 'text/plain' }).end('Origin not allowed');
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': `content-type, ${TOKEN_HEADER}`,
        'Access-Control-Max-Age': '600',
      }).end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${host}`);
    if (req.method === 'GET' && url.pathname === '/events') return this.events(url, res);
    if (req.method === 'POST' && url.pathname === '/reply') return this.reply(req, res);
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, clients: this.clients.length }));
      return;
    }
    res.writeHead(404).end();
  }

  private events(url: URL, res: http.ServerResponse) {
    if (!this.tokenOk(url.searchParams.get('token'))) {
      res.writeHead(401, { 'content-type': 'text/plain' }).end('Invalid pairing token');
      return;
    }
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    });
    res.write('retry: 3000\n: connected\n\n');
    this.clients.push(res);
    this.opts.log?.('ReadFaster tab connected');
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    res.on('close', () => {
      clearInterval(ping);
      this.clients = this.clients.filter((c) => c !== res);
      this.opts.log?.('ReadFaster tab disconnected');
    });
    for (const w of [...this.waiters]) w();
  }

  private reply(req: http.IncomingMessage, res: http.ServerResponse) {
    if (!this.tokenOk(req.headers[TOKEN_HEADER] as string | undefined)) {
      res.writeHead(401).end();
      return;
    }
    let body = '';
    let tooBig = false;
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooBig) return;
      let msg: BridgeReply;
      try {
        msg = JSON.parse(body);
      } catch {
        res.writeHead(400).end();
        return;
      }
      const p = this.pending.get(msg.id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        if (msg.ok) p.resolve(msg.result);
        else p.reject(new Error(msg.error || 'ReadFaster reported an error'));
      }
      res.writeHead(204).end();
    });
  }
}
