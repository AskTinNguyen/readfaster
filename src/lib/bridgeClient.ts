/**
 * Browser side of the agent bridge. Connects to the `readfaster mcp` process
 * on the user's own machine (127.0.0.1), receives commands over
 * Server-Sent Events and POSTs the results back.
 *
 * It only ever connects after the user opens a pairing link from their
 * agent, so ordinary visitors never touch the local network.
 */
import { useSyncExternalStore } from 'react';
import { TOKEN_HEADER, type BridgeCommand, type BridgeEnvelope, type BridgeReply, type Pairing } from './protocol';

export type BridgeStatus = 'off' | 'connecting' | 'connected' | 'error';

interface BridgeSnapshot {
  status: BridgeStatus;
  pairing: Pairing | null;
  lastCommand?: string;
  lastCommandAt?: number;
}

const PAIR_KEY = 'readfaster.bridge.v1';

export function loadPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(PAIR_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pairing;
    return Number.isInteger(p.port) && typeof p.token === 'string' ? p : null;
  } catch {
    return null;
  }
}

function savePairing(p: Pairing | null) {
  try {
    if (p) localStorage.setItem(PAIR_KEY, JSON.stringify(p));
    else localStorage.removeItem(PAIR_KEY);
  } catch { /* ignore */ }
}

let snapshot: BridgeSnapshot = { status: 'off', pairing: null };
const listeners = new Set<() => void>();
function set(patch: Partial<BridgeSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}

export function useBridge(): BridgeSnapshot {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => snapshot,
    () => snapshot,
  );
}

type Handler = (cmd: BridgeCommand) => Promise<unknown>;

let source: EventSource | null = null;
let handler: Handler | null = null;

export function setBridgeHandler(h: Handler) {
  handler = h;
}

const base = (p: Pairing) => `http://127.0.0.1:${p.port}`;

async function reply(p: Pairing, r: BridgeReply) {
  try {
    await fetch(`${base(p)}/reply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [TOKEN_HEADER]: p.token },
      body: JSON.stringify(r),
    });
  } catch { /* bridge gone; the agent's request will time out */ }
}

export function connectBridge(p: Pairing) {
  disconnectBridge(false);
  savePairing(p);
  set({ status: 'connecting', pairing: p });
  const es = new EventSource(`${base(p)}/events?token=${encodeURIComponent(p.token)}`);
  source = es;
  es.onopen = () => set({ status: 'connected' });
  es.onerror = () => {
    // EventSource retries on its own unless the server refused us outright.
    set({ status: es.readyState === EventSource.CLOSED ? 'error' : 'connecting' });
  };
  es.onmessage = async (ev) => {
    let env: BridgeEnvelope;
    try {
      env = JSON.parse(ev.data);
    } catch {
      return;
    }
    set({ lastCommand: env.command?.type, lastCommandAt: Date.now() });
    try {
      if (!handler) throw new Error('App is still loading');
      const result = await handler(env.command);
      await reply(p, { id: env.id, ok: true, result });
    } catch (e) {
      await reply(p, { id: env.id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  };
}

export function disconnectBridge(forget = true) {
  source?.close();
  source = null;
  if (forget) {
    savePairing(null);
    set({ status: 'off', pairing: null });
  }
}

/** Reconnects to the last paired bridge, if the user paired before. */
export function resumeBridge() {
  const p = loadPairing();
  if (p && !source) connectBridge(p);
}
