/**
 * The contract between the web app and the local agent bridge (run by
 * `readfaster mcp`). The bridge listens on 127.0.0.1 only; the app connects
 * with Server-Sent Events for commands and POSTs replies.
 */
import type { ReaderPayload } from './handoff';
import type { SessionMode, SessionRecord, Settings, Summary } from './storage';
import type { BuildOptions } from './promptBuilder';

export const DEFAULT_APP_URL = 'https://readfaster-sooty.vercel.app';
export const DEFAULT_BRIDGE_PORT = 47625;
/** Ports tried when the default is taken (e.g. two agent sessions). */
export const BRIDGE_PORT_RANGE = 10;
export const TOKEN_HEADER = 'x-readfaster-token';

export type DrillId = SessionMode;

export type BridgeCommand =
  | { type: 'get_state'; limit?: number }
  | { type: 'navigate'; route: string }
  | { type: 'load_reader'; payload: ReaderPayload }
  | { type: 'start_drill'; drill: DrillId; passageId?: string; wpm?: number; chunkSize?: number }
  | { type: 'update_settings'; patch: Partial<Settings> };

export interface BridgeEnvelope {
  id: string;
  command: BridgeCommand;
}

export interface BridgeReply {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface AppState {
  route: string;
  settings: Settings;
  summary: Summary;
  recommendedWpm: number;
  recentSessions: SessionRecord[];
  promptOptions: BuildOptions;
}

export interface Pairing {
  port: number;
  token: string;
}

/** Appends pairing parameters to an in-app route like "read?d=…". */
export function withPairing(route: string, pairing?: Pairing): string {
  if (!pairing) return route;
  const sep = route.includes('?') ? '&' : '?';
  return `${route}${sep}port=${pairing.port}&token=${encodeURIComponent(pairing.token)}`;
}

export function appLink(appUrl: string, route: string): string {
  return `${appUrl.replace(/\/+$/, '')}/#/${route.replace(/^[#/]+/, '')}`;
}

export function drillRoute(drill: DrillId, opts: { passageId?: string; wpm?: number; chunkSize?: number } = {}): string {
  const q = new URLSearchParams({ go: '1' });
  if (opts.passageId) q.set('passage', opts.passageId);
  if (opts.wpm) q.set('wpm', String(opts.wpm));
  if (opts.chunkSize) q.set('chunk', String(opts.chunkSize));
  return `train/${drill}?${q}`;
}
