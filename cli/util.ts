import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_APP_URL, DEFAULT_BRIDGE_PORT } from '../src/lib/protocol';

export interface Config {
  appUrl: string;
  port: number;
  allowedOrigins: string[];
  noOpen: boolean;
}

export function loadConfig(env = process.env): Config {
  const appUrl = (env.READFASTER_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '');
  const origins = new Set([
    new URL(DEFAULT_APP_URL).origin,
    new URL(appUrl).origin,
    // Local development and preview builds.
    'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173',
  ]);
  for (const o of (env.READFASTER_ALLOWED_ORIGINS || '').split(',')) if (o.trim()) origins.add(o.trim().replace(/\/+$/, ''));
  const port = Number(env.READFASTER_PORT);
  return {
    appUrl,
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_BRIDGE_PORT,
    allowedOrigins: [...origins],
    noOpen: !!env.READFASTER_NO_OPEN,
  };
}

/**
 * A stable pairing token per machine, so a browser paired once stays paired
 * across agent sessions. Stored with owner-only permissions.
 */
export function loadOrCreateToken(env = process.env): string {
  const dir = env.READFASTER_HOME || join(homedir(), '.readfaster');
  const file = join(dir, 'bridge.json');
  try {
    const t = JSON.parse(readFileSync(file, 'utf8')).token;
    if (typeof t === 'string' && t.length >= 32) return t;
  } catch { /* create below */ }
  const token = randomBytes(24).toString('base64url');
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(file, JSON.stringify({ token }), { mode: 0o600 });
  } catch { /* fall back to a per-process token */ }
  return token;
}

/** Opens a URL in the default browser. Resolves false if that isn't possible. */
export function openUrl(url: string, noOpen = false): Promise<boolean> {
  if (noOpen) return Promise.resolve(false);
  const [cmd, args] =
    process.platform === 'darwin' ? ['open', [url]]
      : process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : ['xdg-open', [url]];
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args as string[], { stdio: 'ignore', detached: true });
      child.once('error', () => resolve(false));
      child.once('spawn', () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}
