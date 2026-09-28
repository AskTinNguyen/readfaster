import { describe, expect, it } from 'vitest';
import { parseArgs } from '../index';
import { decodePayload, encodePayload, validateReaderPayload } from '../../src/lib/handoff';
import { loadConfig } from '../util';

describe('parseArgs', () => {
  it('splits command, positionals and flags', () => {
    expect(parseArgs(['read', 'a.md', '--mode', 'pacer', '--wpm=300', '--json'])).toEqual({
      command: 'read', positional: ['a.md'], flags: { mode: 'pacer', wpm: '300', json: true },
    });
    expect(parseArgs(['analyze', '--json', 'file.md']).positional).toEqual(['file.md']);
    expect(parseArgs([]).command).toBe('help');
  });
});

describe('handoff payloads', () => {
  it('round-trips through the URL encoding', async () => {
    const p = { text: 'Unicode ✓ — “quotes” and emoji 🚀\n\nSecond para', mode: 'rsvp', wpm: 500 };
    const enc = await encodePayload(p);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodePayload(enc)).toEqual(p);
  });

  it('validates untrusted payloads', () => {
    expect(validateReaderPayload({ text: '  ' })).toBeNull();
    expect(validateReaderPayload('nope')).toBeNull();
    const v = validateReaderPayload({ text: 'hi', mode: 'bogus', wpm: 99999, chunkSize: 0, questions: [{ prompt: 'q', options: ['a'], answer: 0 }] })!;
    expect(v).toEqual({ text: 'hi', title: undefined, mode: undefined, wpm: 1500, chunkSize: 1, questions: undefined });
  });
});

describe('config', () => {
  it('allows the default app, the configured app and extra origins', () => {
    const c = loadConfig({ READFASTER_APP_URL: 'https://preview.example/', READFASTER_ALLOWED_ORIGINS: 'https://a.example, https://b.example/', READFASTER_PORT: '5000' });
    expect(c.appUrl).toBe('https://preview.example');
    expect(c.port).toBe(5000);
    expect(c.allowedOrigins).toEqual(expect.arrayContaining(['https://readfaster-sooty.vercel.app', 'https://preview.example', 'https://a.example', 'https://b.example']));
    expect(loadConfig({ READFASTER_PORT: 'abc' }).port).toBe(47625);
  });
});
