import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../mcp';
import type { BridgeServer } from '../bridge';
import type { BridgeCommand } from '../../src/lib/protocol';
import { decodePayload } from '../../src/lib/handoff';

/** Minimal stand-in for the bridge that records commands. */
function fakeBridge(connected: boolean, reply: (c: BridgeCommand) => unknown = () => ({})) {
  const sent: BridgeCommand[] = [];
  const b = {
    port: 47625, token: 'tok', connected,
    waitForClient: async () => b.connected,
    send: async (c: BridgeCommand) => { sent.push(c); return reply(c); },
  };
  return { bridge: b as unknown as BridgeServer, sent };
}

async function connect(bridge: BridgeServer | null, opened: string[]) {
  const server = createMcpServer({ bridge, appUrl: 'https://app.example', openUrl: async (u) => { opened.push(u); return true; }, connectTimeoutMs: 10 });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const textOf = (r: unknown) => ((r as { content: { text: string }[] }).content).map((c) => c.text).join('\n');

describe('MCP server', () => {
  let opened: string[];
  beforeEach(() => { opened = []; });
  afterEach(() => { opened = []; });

  it('lists the documented tools and prompt', async () => {
    const client = await connect(null, opened);
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(['analyze_readability', 'get_progress', 'get_style_prompt', 'list_training_content', 'open_app', 'send_to_reader', 'start_drill', 'tighten_text', 'update_settings']);
    const { MCP_TOOLS } = await import('../../src/lib/agentDocs');
    expect(MCP_TOOLS.map((t) => t.name).sort()).toEqual(names);
    expect((await client.listPrompts()).prompts.map((p) => p.name)).toEqual(['fast_read_style']);
  });

  it('analyzes and tightens without a browser', async () => {
    const client = await connect(null, opened);
    const a = textOf(await client.callTool({ name: 'analyze_readability', arguments: { text: 'Great question! In order to fix it, restart the server.' } }));
    expect(a).toMatch(/Fast-read score: \d+\/100/);
    expect(a).toContain('Compliment opener');
    const t = textOf(await client.callTool({ name: 'tighten_text', arguments: { text: 'Great question! In order to fix it, restart the server.' } }));
    expect(t.split('\n')[0]).toBe('To fix it, restart the server.');
    expect(opened).toEqual([]);
  });

  it('returns presets and, when connected, the user\'s saved style', async () => {
    const c1 = await connect(null, opened);
    expect(textOf(await c1.callTool({ name: 'get_style_prompt', arguments: { preset: 'status', target: 'claude-md' } }))).toMatch(/^## Communication style/);
    const { bridge } = fakeBridge(true, () => ({ promptOptions: { enabled: { bluf: true }, values: {}, target: 'system', extra: 'Use British spelling.' } }));
    const c2 = await connect(bridge, opened);
    const out = textOf(await c2.callTool({ name: 'get_style_prompt', arguments: {} }));
    expect(out).toContain('Use British spelling.');
    expect(out).toContain("user's saved ReadFaster style");
  });

  it('sends text over the bridge when a tab is connected', async () => {
    const { bridge, sent } = fakeBridge(true);
    const client = await connect(bridge, opened);
    const r = await client.callTool({ name: 'send_to_reader', arguments: {
      text: 'Hello there reader.', title: 'T', mode: 'pacer',
      questions: [{ prompt: 'Q?', options: ['a', 'b'], answer: 1 }, { prompt: 'Bad', options: ['a', 'b'], answer: 5 }],
    } });
    expect(sent[0].type).toBe('load_reader');
    expect(textOf(r)).toMatch(/with 1 questions/);
    expect(textOf(r)).toMatch(/1 question\(s\) were dropped/);
    expect(opened).toEqual([]);
  });

  it('falls back to a paired deep link when no tab is connected', async () => {
    const { bridge } = fakeBridge(false);
    const client = await connect(bridge, opened);
    await client.callTool({ name: 'send_to_reader', arguments: { text: 'Some text to read.', mode: 'chunk', wpm: 420 } });
    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]);
    expect(url.origin).toBe('https://app.example');
    const params = new URLSearchParams(url.hash.split('?')[1]);
    expect(params.get('port')).toBe('47625');
    expect(params.get('token')).toBe('tok');
    expect(await decodePayload(params.get('d')!)).toMatchObject({ text: 'Some text to read.', mode: 'chunk', wpm: 420 });
  });

  it('opens a drill link and validates passages', async () => {
    const client = await connect(null, opened);
    await client.callTool({ name: 'start_drill', arguments: { drill: 'pacer', wpm: 380 } });
    expect(opened[0]).toBe('https://app.example/#/train/pacer?go=1&wpm=380');
    const bad = await client.callTool({ name: 'start_drill', arguments: { drill: 'pacer', passage_id: 'nope' } });
    expect(bad.isError).toBe(true);
  });

  it('reports clearly when progress needs the app but it never connects', async () => {
    const { bridge } = fakeBridge(false);
    const client = await connect(bridge, opened);
    const r = await client.callTool({ name: 'get_progress', arguments: {} });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatch(/did not connect/);
    expect(opened[0]).toContain('#/progress?port=47625&token=tok');
  });

  it('maps settings to the app\'s names', async () => {
    const { bridge, sent } = fakeBridge(true, (c) => ({ settings: (c as { patch: unknown }).patch }));
    const client = await connect(bridge, opened);
    await client.callTool({ name: 'update_settings', arguments: { wpm: 380, chunk_size: 3, fade_read: false } });
    expect(sent[0]).toEqual({ type: 'update_settings', patch: { wpm: 380, chunkSize: 3, fadeRead: false } });
  });
});

describe('MCP server without a browser', () => {
  it('returns the pairing link immediately when the browser cannot be opened', async () => {
    const { bridge } = fakeBridge(false);
    const server = createMcpServer({ bridge, appUrl: 'https://app.example', openUrl: async () => false, connectTimeoutMs: 60000 });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '1' });
    await Promise.all([server.connect(a), client.connect(b)]);
    const started = Date.now();
    const r = await client.callTool({ name: 'get_progress', arguments: {} });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(r.isError).toBe(true);
    expect(textOf(r)).toMatch(/Ask the user to open this link.*#\/progress\?port=47625&token=tok/);
  });
});
