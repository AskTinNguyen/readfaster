/**
 * MCP server: lets the user's own agent (Claude Code, Codex, Cursor, …) use
 * ReadFaster. Text tools run locally with no browser; app tools drive the
 * user's ReadFaster tab through the local bridge.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { analyze, tighten } from '../src/lib/analyzer';
import { DRILLS } from '../src/lib/drills';
import { encodePayload, validateReaderPayload } from '../src/lib/handoff';
import { PRESETS, TARGETS, applyPreset, buildPrompt, defaultOptions, type Target } from '../src/lib/promptBuilder';
import { appLink, drillRoute, withPairing, type AppState, type DrillId, type Pairing } from '../src/lib/protocol';
import { PASSAGES } from '../src/data/passages';
import { countWords } from '../src/lib/text';
import type { BridgeServer } from './bridge';
import { analysisReport } from './format';

export interface McpDeps {
  /** Null when the local bridge could not start; link-based tools still work. */
  bridge: BridgeServer | null;
  appUrl: string;
  openUrl: (url: string) => Promise<boolean>;
  /** How long app tools wait for the tab to connect after opening a pairing link. */
  connectTimeoutMs?: number;
  version?: string;
}

const INSTRUCTIONS = `ReadFaster helps the user read AI-generated text faster and trains their reading speed.
- Before sending the user a long reply, report or summary, you can run analyze_readability on your draft and fix what it flags; get_style_prompt returns the user's preferred writing style.
- When the user wants to read or review something long, offer send_to_reader. Write 3-5 multiple-choice questions on the key points (decisions, numbers, risks, action items) and pass them as "questions" so they get a comprehension check.
- For practice, use get_progress to see their current speed, then start_drill.
- App tools open the user's browser if ReadFaster is not open yet. Always pass on any link a tool returns.`;

const PAGES = ['home', 'train', 'read', 'agent', 'progress', 'agents', 'learn'] as const;
const DRILL_IDS = DRILLS.map((d) => d.id) as [DrillId, ...DrillId[]];
const PRESET_IDS = PRESETS.map((p) => p.id) as [string, ...string[]];
const TARGET_IDS = TARGETS.map((t) => t.id) as [Target, ...Target[]];

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const json = (label: string, v: unknown) => text(`${label}\n\n${JSON.stringify(v, null, 2)}`);
const fail = (t: string) => ({ content: [{ type: 'text' as const, text: t }], isError: true });

export function createMcpServer(deps: McpDeps): McpServer {
  const { bridge, appUrl } = deps;
  const connectTimeout = deps.connectTimeoutMs ?? 20000;
  const pairing = (): Pairing | undefined => (bridge ? { port: bridge.port, token: bridge.token } : undefined);
  const link = (route: string) => appLink(appUrl, withPairing(route, pairing()));

  const openLink = async (url: string, what: string) => {
    const opened = await deps.openUrl(url);
    return opened
      ? `Opened ${what} in the user's browser. If it did not appear, give the user this link: ${url}`
      : `Could not open a browser. Ask the user to open this link: ${url}`;
  };

  /** Makes sure a ReadFaster tab is connected, opening a pairing link if needed. */
  const ensureApp = async (route: string): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!bridge) return { ok: false, message: 'The local agent bridge is not running, so live app control is unavailable. Tools that send text still work via links.' };
    if (bridge.connected) return { ok: true };
    const url = link(route);
    if (!(await deps.openUrl(url))) {
      return { ok: false, message: `ReadFaster is not open. Ask the user to open this link, then try again: ${url}` };
    }
    if (await bridge.waitForClient(connectTimeout)) return { ok: true };
    return { ok: false, message: `ReadFaster did not connect. If the browser did not open it, ask the user to open this link, then try again: ${url}` };
  };

  const server = new McpServer({ name: 'readfaster', version: deps.version ?? '0.0.0' }, { instructions: INSTRUCTIONS });

  server.registerTool('analyze_readability', {
    title: 'Analyze readability',
    description: 'Score text 0-100 for how fast a person can read it, with specific findings (answer not up front, filler phrases, long sentences, walls of text, missing structure). Use on drafts before sending long replies.',
    inputSchema: { text: z.string().min(1).describe('Markdown or plain text to analyze'), wpm: z.number().int().min(60).max(1500).optional().describe('Reading speed for the time estimate (default 250)') },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ text: input, wpm }) => text(analysisReport(analyze(input, wpm ?? 250), wpm ?? 250)));

  server.registerTool('tighten_text', {
    title: 'Tighten text',
    description: 'Deterministically remove stock openers ("Great question!"), sign-offs ("Hope this helps!") and wordy phrases ("in order to") from text. Code blocks are untouched. Returns the tightened text.',
    inputSchema: { text: z.string().min(1) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ text: input }) => {
    const r = tighten(input);
    return {
      content: [
        { type: 'text' as const, text: r.text },
        { type: 'text' as const, text: `(${r.wordsBefore} → ${r.wordsAfter} words; removed ${r.removedSentences} filler sentences, rewrote ${r.replacedPhrases} phrases)` },
      ],
    };
  });

  server.registerTool('get_style_prompt', {
    title: 'Get fast-read style prompt',
    description: 'Get writing instructions that make output fast to read. Without a preset, returns the style the user saved in ReadFaster (if the app is connected) or sensible defaults. Use it to shape your own replies or to write it into CLAUDE.md / AGENTS.md / a system prompt.',
    inputSchema: {
      preset: z.enum(PRESET_IDS).optional().describe('chat | coding | research | status'),
      target: z.enum(TARGET_IDS).optional().describe('Wrapper format: system | claude-md | custom-instructions | inline (default system)'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ preset, target }) => {
    const t: Target = target ?? 'system';
    let source = 'defaults';
    let opts = { ...defaultOptions(), target: t };
    if (preset) {
      opts = applyPreset(PRESETS.find((p) => p.id === preset)!, t);
      source = `preset "${preset}"`;
    } else if (bridge?.connected) {
      try {
        const state = (await bridge.send({ type: 'get_state', limit: 1 })) as AppState;
        opts = { ...state.promptOptions, target: t };
        source = "the user's saved ReadFaster style";
      } catch { /* fall back to defaults */ }
    }
    return {
      content: [
        { type: 'text' as const, text: buildPrompt(opts) },
        { type: 'text' as const, text: `(source: ${source})` },
      ],
    };
  });

  server.registerTool('list_training_content', {
    title: 'List drills and passages',
    description: 'List ReadFaster training drills and practice passages (ids for start_drill).',
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => json('Drills and passages:', {
    drills: DRILLS.map((d) => ({ id: d.id, name: d.name, technique: d.technique, usesPassage: d.reading, description: d.blurb })),
    passages: PASSAGES.map((p) => ({ id: p.id, title: p.title, topic: p.topic, level: p.level, words: countWords(p.text), questions: p.questions.length })),
  }));

  const questionSchema = z.object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(8),
    answer: z.number().int().min(0).describe('0-based index of the correct option'),
  });

  server.registerTool('send_to_reader', {
    title: 'Send text to the ReadFaster reader',
    description: 'Open text in the user\'s ReadFaster Reader so they can read it with a pacer, phrase chunks or flash reading. Attach multiple-choice questions on the key points to give them a scored comprehension check. Opens the browser if needed.',
    inputSchema: {
      text: z.string().min(1).describe('Markdown or plain text'),
      title: z.string().max(200).optional(),
      mode: z.enum(['view', 'pacer', 'chunk', 'rsvp']).optional().describe('view = formatted text (default); pacer = moving guide; chunk = phrase flashes; rsvp = one word at a time'),
      wpm: z.number().int().min(60).max(1500).optional().describe('Reading speed; omit to keep the user\'s own setting'),
      chunk_size: z.number().int().min(1).max(5).optional(),
      questions: z.array(questionSchema).max(20).optional(),
    },
    annotations: { openWorldHint: false },
  }, async (args) => {
    const payload = validateReaderPayload({
      text: args.text, title: args.title, mode: args.mode, wpm: args.wpm, chunkSize: args.chunk_size, questions: args.questions,
    });
    if (!payload) return fail('Nothing to send: text is empty.');
    const dropped = (args.questions?.length ?? 0) - (payload.questions?.length ?? 0);
    const warn = dropped > 0 ? ` ${dropped} question(s) were dropped because their answer index was out of range.` : '';
    if (bridge?.connected) {
      try {
        await bridge.send({ type: 'load_reader', payload });
        return text(`Loaded ${countWords(payload.text)} words into the user's ReadFaster reader${payload.questions ? ` with ${payload.questions.length} questions` : ''}.${warn}`);
      } catch { /* fall back to a link */ }
    }
    const url = link(`read?d=${await encodePayload(payload)}`);
    return text(`${await openLink(url, 'the text in ReadFaster')}${warn}`);
  });

  server.registerTool('start_drill', {
    title: 'Start a training drill',
    description: 'Start a ReadFaster drill in the user\'s browser. Reading drills default to the user\'s recommended speed. Use list_training_content for ids.',
    inputSchema: {
      drill: z.enum(DRILL_IDS).describe('test | pacer | chunk | rsvp | ramp | span | schulte'),
      passage_id: z.string().optional(),
      wpm: z.number().int().min(60).max(1500).optional(),
      chunk_size: z.number().int().min(2).max(5).optional(),
    },
    annotations: { openWorldHint: false },
  }, async ({ drill, passage_id, wpm, chunk_size }) => {
    if (passage_id && !PASSAGES.some((p) => p.id === passage_id)) return fail(`Unknown passage "${passage_id}". Use list_training_content.`);
    if (bridge?.connected) {
      try {
        await bridge.send({ type: 'start_drill', drill, passageId: passage_id, wpm, chunkSize: chunk_size });
        return text(`Started the ${DRILLS.find((d) => d.id === drill)!.name} drill in ReadFaster. The user presses Start when ready.`);
      } catch { /* fall back to a link */ }
    }
    return text(await openLink(link(drillRoute(drill, { passageId: passage_id, wpm, chunkSize: chunk_size })), 'the drill'));
  });

  server.registerTool('open_app', {
    title: 'Open ReadFaster',
    description: 'Open ReadFaster in the user\'s browser (or switch pages if already open) and connect it to this agent.',
    inputSchema: { page: z.enum(PAGES).optional().describe('Page to show (default home)') },
    annotations: { openWorldHint: false },
  }, async ({ page }) => {
    const route = page ?? 'home';
    if (bridge?.connected) {
      await bridge.send({ type: 'navigate', route });
      return text(`ReadFaster is showing the ${route} page.`);
    }
    const ready = await ensureApp(route);
    return text(ready.ok ? `ReadFaster is open and connected, on the ${route} page.` : ready.message);
  });

  server.registerTool('get_progress', {
    title: 'Get reading progress',
    description: 'Read the user\'s ReadFaster stats: baseline and latest speed, effective speed (speed x comprehension), streak, recommended training speed, settings and recent sessions. Opens ReadFaster if needed (progress lives in the browser).',
    inputSchema: { limit: z.number().int().min(1).max(100).optional().describe('Recent sessions to include (default 20)') },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit }) => {
    const ready = await ensureApp('progress');
    if (!ready.ok) return fail(ready.message);
    const s = (await bridge!.send({ type: 'get_state', limit: limit ?? 20 })) as AppState;
    return json('ReadFaster progress:', {
      summary: s.summary,
      recommendedWpm: s.recommendedWpm,
      settings: s.settings,
      recentSessions: s.recentSessions,
    });
  });

  server.registerTool('update_settings', {
    title: 'Update reading settings',
    description: 'Change the user\'s ReadFaster settings, e.g. reading speed or chunk size. Only pass what should change.',
    inputSchema: {
      wpm: z.number().int().min(60).max(1500).optional(),
      chunk_size: z.number().int().min(1).max(5).optional(),
      font: z.enum(['sans', 'serif', 'mono']).optional(),
      font_size: z.number().int().min(14).max(32).optional(),
      theme: z.enum(['system', 'light', 'dark']).optional(),
      bionic: z.boolean().optional().describe('Bold word beginnings'),
      fade_read: z.boolean().optional().describe('Dim text the pacer has passed'),
      beat: z.boolean().optional().describe('Soft beat to occupy the inner voice'),
      beat_bpm: z.number().int().min(60).max(160).optional(),
      orp: z.boolean().optional().describe('Highlight the focus letter in flash reading'),
    },
    annotations: { openWorldHint: false },
  }, async (a) => {
    const patch = Object.fromEntries(Object.entries({
      wpm: a.wpm, chunkSize: a.chunk_size, font: a.font, fontSize: a.font_size, theme: a.theme,
      bionic: a.bionic, fadeRead: a.fade_read, beat: a.beat, beatBpm: a.beat_bpm, orp: a.orp,
    }).filter(([, v]) => v !== undefined));
    if (!Object.keys(patch).length) return fail('No settings given.');
    const ready = await ensureApp('home');
    if (!ready.ok) return fail(ready.message);
    const r = (await bridge!.send({ type: 'update_settings', patch })) as { settings: unknown };
    return json('Updated. Current settings:', r.settings);
  });

  server.registerPrompt('fast_read_style', {
    title: 'Write for fast reading',
    description: 'Apply ReadFaster\'s fast-read writing style to the rest of the conversation.',
    argsSchema: { preset: z.string().optional().describe('chat | coding | research | status') },
  }, ({ preset }) => {
    const p = PRESETS.find((x) => x.id === preset);
    const opts = p ? applyPreset(p, 'inline') : { ...defaultOptions(), target: 'inline' as Target };
    const style = buildPrompt(opts).replace(/\n\n---\n$/, '');
    return {
      messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `For the rest of this conversation, write every reply for fast reading.\n\n${style}` } }],
    };
  });

  return server;
}
