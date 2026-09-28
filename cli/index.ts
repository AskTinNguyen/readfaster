/**
 * readfaster CLI: fast-read tools for your terminal and your agent.
 *
 *   readfaster mcp                 MCP server (stdio) for Claude Code, Codex, Cursor, …
 *   readfaster analyze [file]      score text for fast reading
 *   readfaster tighten [file]      strip filler
 *   readfaster prompt              print a fast-read style prompt
 *   readfaster read [file]         open text in the ReadFaster reader
 *   readfaster drill <id>          open a training drill
 *   readfaster drills              list drills and passages
 */
import { readFileSync } from 'node:fs';
import { analyze, tighten } from '../src/lib/analyzer';
import { DRILLS } from '../src/lib/drills';
import { encodePayload, validateReaderPayload, READER_MODES, type ReaderMode } from '../src/lib/handoff';
import { PRESETS, TARGETS, applyPreset, buildPrompt, defaultOptions, type Target } from '../src/lib/promptBuilder';
import { appLink, drillRoute, type DrillId } from '../src/lib/protocol';
import { PASSAGES } from '../src/data/passages';
import { countWords } from '../src/lib/text';
import { analysisJson, analysisReport } from './format';
import { loadConfig, openUrl } from './util';

declare const __VERSION__: string;
const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';

const HELP = `readfaster ${VERSION}: read AI output faster, and make agents write for fast reading.

Usage: readfaster <command> [options]

Commands
  mcp                     Run the MCP server (stdio). Add it to your agent:
                            claude mcp add readfaster -- npx -y github:AskTinNguyen/readfaster mcp
  analyze [file|-]        Score text 0-100 for fast reading     --json  --wpm <n>
  tighten [file|-]        Strip filler and wordy phrases; prints the result
  prompt                  Print a fast-read style prompt       --preset ${PRESETS.map((p) => p.id).join('|')}
                                                               --target ${TARGETS.map((t) => t.id).join('|')}
  read [file|-]           Open text in the ReadFaster reader   --mode ${READER_MODES.join('|')}  --wpm <n>  --title <t>
  drill <id>              Open a drill (${DRILLS.map((d) => d.id).join(', ')})   --wpm <n>  --passage <id>  --chunk <n>
  drills                  List drills and practice passages
  help, --version

Input is read from the file, or from stdin when the file is "-" or omitted.

Environment
  READFASTER_APP_URL         Web app URL (default ${loadConfig().appUrl})
  READFASTER_PORT            Local bridge port for "mcp" (default ${loadConfig().port})
  READFASTER_NO_OPEN=1       Print links instead of opening the browser
  READFASTER_ALLOWED_ORIGINS Extra comma-separated origins allowed to pair (e.g. preview deployments)
`;

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=', 2);
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') && !['json', 'help', 'version', 'no-open'].includes(k)) flags[k] = argv[++i];
      else flags[k] = true;
    } else if (a === '-h') flags.help = true;
    else positional.push(a);
  }
  return { command: positional.shift() ?? 'help', positional, flags };
}

class UsageError extends Error {}

async function readInput(file: string | undefined): Promise<string> {
  let text: string;
  if (file && file !== '-') {
    try {
      text = readFileSync(file, 'utf8');
    } catch (e) {
      throw new UsageError(`Cannot read ${file}: ${(e as NodeJS.ErrnoException).code ?? e}`);
    }
  } else {
    if (process.stdin.isTTY) throw new UsageError('No input: pass a file, or pipe text in (e.g. pbpaste | readfaster analyze).');
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    text = Buffer.concat(chunks).toString('utf8');
  }
  if (!text.trim()) throw new UsageError('Input is empty.');
  return text;
}

function intFlag(flags: Args['flags'], name: string, lo: number, hi: number): number | undefined {
  const v = flags[name];
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new UsageError(`--${name} must be a whole number from ${lo} to ${hi}`);
  return n;
}

export async function main(argv: string[]): Promise<number> {
  const { command, positional, flags } = parseArgs(argv);
  const cfg = loadConfig();
  const noOpen = cfg.noOpen || !!flags['no-open'];
  const out = (s: string) => process.stdout.write(s.endsWith('\n') ? s : `${s}\n`);
  const openAndReport = async (url: string) => {
    const opened = await openUrl(url, noOpen);
    out(opened ? `Opened ${url.length > 120 ? `${url.slice(0, 117)}...` : url}` : url);
  };

  if (flags.version || command === '--version' || command === 'version') {
    out(VERSION);
    return 0;
  }
  if (flags.help || command === 'help') {
    out(HELP);
    return 0;
  }

  switch (command) {
    case 'mcp': {
      const { runMcp } = await import('./server');
      await runMcp(VERSION);
      return 0;
    }
    case 'analyze': {
      const wpm = intFlag(flags, 'wpm', 60, 1500) ?? 250;
      const a = analyze(await readInput(positional[0]), wpm);
      out(flags.json ? JSON.stringify(analysisJson(a), null, 2) : analysisReport(a, wpm));
      return 0;
    }
    case 'tighten': {
      const r = tighten(await readInput(positional[0]));
      out(r.text);
      process.stderr.write(`${r.wordsBefore} → ${r.wordsAfter} words (removed ${r.removedSentences} filler sentences, rewrote ${r.replacedPhrases} phrases)\n`);
      return 0;
    }
    case 'prompt': {
      const target = (flags.target as Target | undefined) ?? 'system';
      if (!TARGETS.some((t) => t.id === target)) throw new UsageError(`--target must be one of: ${TARGETS.map((t) => t.id).join(', ')}`);
      const preset = flags.preset as string | undefined;
      const p = preset ? PRESETS.find((x) => x.id === preset) : undefined;
      if (preset && !p) throw new UsageError(`--preset must be one of: ${PRESETS.map((x) => x.id).join(', ')}`);
      out(buildPrompt(p ? applyPreset(p, target) : { ...defaultOptions(), target }));
      return 0;
    }
    case 'read': {
      const mode = flags.mode as ReaderMode | undefined;
      if (mode && !READER_MODES.includes(mode)) throw new UsageError(`--mode must be one of: ${READER_MODES.join(', ')}`);
      const payload = validateReaderPayload({
        text: await readInput(positional[0]),
        title: typeof flags.title === 'string' ? flags.title : undefined,
        mode,
        wpm: intFlag(flags, 'wpm', 60, 1500),
        chunkSize: intFlag(flags, 'chunk', 1, 5),
      });
      if (!payload) throw new UsageError('Input is empty.');
      await openAndReport(appLink(cfg.appUrl, `read?d=${await encodePayload(payload)}`));
      return 0;
    }
    case 'drill': {
      const id = positional[0] as DrillId | undefined;
      if (!id || !DRILLS.some((d) => d.id === id)) throw new UsageError(`Choose a drill: ${DRILLS.map((d) => d.id).join(', ')}`);
      const passage = flags.passage as string | undefined;
      if (passage && !PASSAGES.some((p) => p.id === passage)) throw new UsageError(`Unknown passage. Run "readfaster drills" to list them.`);
      await openAndReport(appLink(cfg.appUrl, drillRoute(id, { passageId: passage, wpm: intFlag(flags, 'wpm', 60, 1500), chunkSize: intFlag(flags, 'chunk', 2, 5) })));
      return 0;
    }
    case 'drills': {
      if (flags.json) {
        out(JSON.stringify({ drills: DRILLS, passages: PASSAGES.map(({ id, title, topic, level, text }) => ({ id, title, topic, level, words: countWords(text) })) }, null, 2));
        return 0;
      }
      out('Drills');
      for (const d of DRILLS) out(`  ${d.id.padEnd(8)} ${d.name} (${d.technique})`);
      out('\nPassages');
      for (const p of PASSAGES) out(`  ${p.id.padEnd(26)} ${p.level.padEnd(7)} ${countWords(p.text)} words  ${p.title}`);
      return 0;
    }
    default:
      throw new UsageError(`Unknown command "${command}". Run "readfaster help".`);
  }
}

// Run when executed directly (the bundled bin), not when imported by tests.
if (typeof require !== 'undefined' && require.main === module) {
  // Exit quietly when piped into a command that stops reading (e.g. `| head`).
  process.stdout.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EPIPE') process.exit(0);
    throw e;
  });
  main(process.argv.slice(2)).then(
    (code) => { if (code) process.exitCode = code; },
    (e) => {
      process.stderr.write(`readfaster: ${e instanceof Error ? e.message : String(e)}\n`);
      process.exitCode = e instanceof UsageError ? 2 : 1;
    },
  );
}
