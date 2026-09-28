/**
 * Hand-off payloads: how an agent (via the CLI or MCP server) passes text,
 * reading settings and quiz questions into the web app. Payloads travel in
 * the URL fragment, which browsers never send to the server, so content
 * stays on the user's machine.
 *
 * Shared by the browser app and the Node CLI; uses only web-standard APIs
 * (CompressionStream, btoa/atob) available in both.
 */
import type { Question } from '../data/types';

export type ReaderMode = 'view' | 'pacer' | 'rsvp' | 'chunk';
export const READER_MODES: ReaderMode[] = ['view', 'pacer', 'rsvp', 'chunk'];

export interface ReaderPayload {
  text: string;
  title?: string;
  mode?: ReaderMode;
  wpm?: number;
  chunkSize?: number;
  /** Comprehension questions written by the user's agent. */
  questions?: Question[];
}

const MAX_TEXT = 200_000;

const clampInt = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined;

/** Validates untrusted input into a safe payload, or returns null. */
export function validateReaderPayload(x: unknown): ReaderPayload | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.text !== 'string' || !o.text.trim()) return null;
  const questions = Array.isArray(o.questions)
    ? o.questions.flatMap((q): Question[] => {
        if (!q || typeof q !== 'object') return [];
        const { prompt, options, answer } = q as Record<string, unknown>;
        if (typeof prompt !== 'string' || !Array.isArray(options)) return [];
        const opts = options.filter((s): s is string => typeof s === 'string').slice(0, 8);
        if (opts.length < 2 || typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer >= opts.length) return [];
        return [{ prompt: prompt.slice(0, 500), options: opts.map((s) => s.slice(0, 300)), answer }];
      }).slice(0, 20)
    : undefined;
  return {
    text: o.text.slice(0, MAX_TEXT),
    title: typeof o.title === 'string' ? o.title.slice(0, 200) : undefined,
    mode: READER_MODES.includes(o.mode as ReaderMode) ? (o.mode as ReaderMode) : undefined,
    wpm: clampInt(o.wpm, 60, 1500),
    chunkSize: clampInt(o.chunkSize, 1, 5),
    questions: questions && questions.length ? questions : undefined,
  };
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** JSON -> deflate-raw -> base64url. */
export async function encodePayload(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
}

export async function decodePayload(encoded: string): Promise<unknown> {
  const bytes = await pipe(fromBase64Url(encoded), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(bytes));
}
