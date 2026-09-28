/**
 * Scores a piece of agent output for how fast it can be read, and explains
 * what to change. Everything here is heuristic and runs locally.
 */
import { countWords, readability, splitSentences } from './text';

export type FillerKind = 'preamble' | 'closer' | 'hedge' | 'wordy';

interface FillerRule {
  kind: FillerKind;
  pattern: RegExp;
  /** Replacement used by `tighten`. `null` removes the whole sentence. */
  replace: string | null;
  label: string;
}

// Sentence-level rules match a whole sentence; phrase-level rules match inside one.
const SENTENCE_RULES: FillerRule[] = [
  { kind: 'preamble', label: 'Compliment opener', replace: null,
    pattern: /^(great|good|excellent|fantastic|interesting) (question|point|idea|catch)[^.!?]*[.!?]/i },
  { kind: 'preamble', label: 'Eager acknowledgement', replace: null,
    pattern: /^(certainly|sure|absolutely|of course|definitely|okay|ok|got it|understood)[!.,]\s*/i },
  { kind: 'preamble', label: '"Happy to help" opener', replace: null,
    pattern: /^(i'?d|i would|i am|i'm) (be )?(happy|glad|delighted) to [^.!?]*[.!?]/i },
  { kind: 'preamble', label: 'Announces instead of answering', replace: null,
    pattern: /^(let me|let's|i'?ll|i will) (break (this|it) down|explain|walk you through|take a look|dive in|start by)[^.!?]*[.!?:]/i },
  { kind: 'preamble', label: 'Announces instead of answering', replace: null,
    pattern: /^here(?:'s| is| are) (?:a |an |the |some )?(?:quick |brief |detailed |comprehensive )?(?:overview|breakdown|summary|explanation|rundown)[^.!?]*[.!?:]/i },
  { kind: 'closer', label: '"Hope this helps" closer', replace: null,
    pattern: /^i hope (this|that|it) (helps|was helpful|clarifies)[^.!?]*[.!?]/i },
  { kind: 'closer', label: 'Open-ended offer closer', replace: null,
    pattern: /^(let me know|feel free|don't hesitate|please don't hesitate|if you have any (other|more|further) questions)[^.!?]*[.!?]/i },
  { kind: 'closer', label: 'Offer to do more', replace: null,
    pattern: /^(would you like me to|do you want me to|shall i|want me to) [^.!?]*\?/i },
  { kind: 'closer', label: 'Restated summary opener', replace: null,
    pattern: /^(in summary|in conclusion|to summarize|to sum up|overall),? (this|that|these|i hope)[^.!?]*[.!?]/i },
];

const PHRASE_RULES: FillerRule[] = [
  { kind: 'hedge', label: 'Throat-clearing', replace: '',
    pattern: /\b(it'?s|it is) (worth noting|important to note|worth mentioning|important to remember) that\s*/gi },
  { kind: 'hedge', label: 'Throat-clearing', replace: '',
    pattern: /(?<=^|[.!?:]\s+)(it should be noted|note|keep in mind|bear in mind) that\s+/gi },
  { kind: 'hedge', label: 'Filler adverb', replace: '',
    pattern: /(?<!\bnot\s)\b(basically|essentially|actually|really|very|quite|literally),?\s+(?=\w)/gi },
  { kind: 'hedge', label: 'Stacked hedge', replace: 'may',
    pattern: /\b(might possibly|could potentially|may potentially|could possibly)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'to', pattern: /\bin order to\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'because', pattern: /\b(due to the fact that|owing to the fact that|given the fact that)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'now', pattern: /\b(at this point in time|at the present time)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'if', pattern: /\bin the event that\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'can', pattern: /\b(has the ability to|is able to)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'many', pattern: /\b(a large number of|a wide variety of|a wide range of)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'some', pattern: /\ba number of\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'about', pattern: /\b(with regard to|with respect to|in relation to)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'use', pattern: /\b(make use of|utilize)\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'for', pattern: /\bfor the purpose of\b/gi },
  { kind: 'wordy', label: 'Wordy phrase', replace: 'although', pattern: /\bdespite the fact that\b/gi },
];

export interface FillerHit {
  kind: FillerKind;
  label: string;
  match: string;
  /** Offset into the analyzed text. */
  index: number;
}

export type Severity = 'good' | 'info' | 'warn' | 'bad';

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface Analysis {
  words: number;
  readingSeconds: number;
  sentences: number;
  avgSentenceLength: number;
  longSentences: string[];
  paragraphs: number;
  longParagraphs: number;
  headings: number;
  bullets: number;
  codeBlocks: number;
  tables: number;
  boldSpans: number;
  fleschEase: number;
  grade: number;
  fillers: FillerHit[];
  /** 0-100, higher is faster to read. */
  score: number;
  findings: Finding[];
}

interface Block {
  kind: 'para' | 'heading' | 'list' | 'code' | 'table' | 'quote';
  text: string;
  start: number;
}

/** Splits Markdown-ish text into top-level blocks, keeping source offsets. */
export function splitBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  let offset = 0;
  let i = 0;
  const lineStart: number[] = [];
  for (const l of lines) {
    lineStart.push(offset);
    offset += l.length + 1;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const start = lineStart[i];

    if (/^\s*```/.test(line)) {
      let j = i + 1;
      while (j < lines.length && !/^\s*```/.test(lines[j])) j++;
      blocks.push({ kind: 'code', text: lines.slice(i, j + 1).join('\n'), start });
      i = j + 1;
      continue;
    }
    if (/^\s{0,3}#{1,6}\s/.test(line)) {
      blocks.push({ kind: 'heading', text: line, start });
      i++;
      continue;
    }
    const kindOf = (l: string): Block['kind'] =>
      /^\s*([-*+]|\d+[.)])\s/.test(l) ? 'list'
        : /^\s*\|.*\|\s*$/.test(l) ? 'table'
          : /^\s*>/.test(l) ? 'quote' : 'para';
    const kind = kindOf(line);
    let j = i + 1;
    while (j < lines.length && lines[j].trim() && !/^\s*```/.test(lines[j]) && !/^\s{0,3}#{1,6}\s/.test(lines[j])) {
      const k = kindOf(lines[j]);
      // A list continues through indented continuation lines.
      if (k !== kind && !(kind === 'list' && k === 'para' && /^\s+/.test(lines[j]))) break;
      j++;
    }
    blocks.push({ kind, text: lines.slice(i, j).join('\n'), start });
    i = j;
  }
  return blocks;
}

function findFillers(text: string, blocks: Block[]): FillerHit[] {
  const hits: FillerHit[] = [];
  for (const b of blocks) {
    if (b.kind === 'code' || b.kind === 'table') continue;
    const body = b.text;
    // Sentence rules: test each sentence start.
    const sentenceStarts = [0];
    const re = /[.!?:]\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) sentenceStarts.push(m.index + m[0].length);
    for (const s of sentenceStarts) {
      const rest = body.slice(s).replace(/^\s*([-*+]|\d+[.)])\s+/, '');
      const lead = body.length - s - rest.length;
      for (const rule of SENTENCE_RULES) {
        const mm = rule.pattern.exec(rest);
        if (mm) {
          hits.push({ kind: rule.kind, label: rule.label, match: mm[0], index: b.start + s + lead });
          break;
        }
      }
    }
    for (const rule of PHRASE_RULES) {
      rule.pattern.lastIndex = 0;
      let pm: RegExpExecArray | null;
      while ((pm = rule.pattern.exec(body))) {
        hits.push({ kind: rule.kind, label: rule.label, match: pm[0].trim(), index: b.start + pm.index });
        if (pm[0].length === 0) rule.pattern.lastIndex++;
      }
    }
  }
  void text;
  return hits.sort((a, b) => a.index - b.index);
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function analyze(md: string, wpm = 250): Analysis {
  const blocks = splitBlocks(md);
  const proseBlocks = blocks.filter((b) => b.kind === 'para' || b.kind === 'list' || b.kind === 'quote');
  const prose = proseBlocks
    .map((b) => b.text.replace(/^\s*([-*+]|\d+[.)])\s+/gm, '').replace(/[*_`#>]/g, ''))
    .join('\n\n');
  const r = readability(prose);
  const words = countWords(md.replace(/```[\s\S]*?```/g, ''));

  const sentences = proseBlocks.flatMap((b) =>
    b.kind === 'list'
      ? b.text.split('\n').flatMap((l) => splitSentences(l.replace(/^\s*([-*+]|\d+[.)])\s+/, '')))
      : splitSentences(b.text),
  );
  const longSentences = sentences.filter((s) => countWords(s) > 30);
  const paras = blocks.filter((b) => b.kind === 'para');
  const longParagraphs = paras.filter((b) => countWords(b.text) > 80).length;
  const headings = blocks.filter((b) => b.kind === 'heading').length;
  const bullets = blocks
    .filter((b) => b.kind === 'list')
    .reduce((n, b) => n + b.text.split('\n').filter((l) => /^\s*([-*+]|\d+[.)])\s/.test(l)).length, 0);
  const codeBlocks = blocks.filter((b) => b.kind === 'code').length;
  const tables = blocks.filter((b) => b.kind === 'table').length;
  const boldSpans = (md.match(/(\*\*|__)[^*_\n]+\1/g) || []).length;
  const fillers = findFillers(md, blocks);

  const findings: Finding[] = [];
  let score = 100;

  // 1. Bottom line up front.
  const firstProse = blocks.find((b) => b.kind !== 'heading');
  const firstFiller = fillers.find((f) => f.kind === 'preamble');
  const opensWithFiller = !!firstProse && !!firstFiller && firstFiller.index <= firstProse.start + 3;
  if (opensWithFiller) {
    score -= 15;
    findings.push({
      id: 'bluf', severity: 'bad', title: 'Answer is not up front',
      detail: `It opens with "${firstFiller!.match.slice(0, 60)}". Make the first sentence the answer or decision, then add support.`,
    });
  } else if (words > 40) {
    findings.push({ id: 'bluf', severity: 'good', title: 'Opens with content', detail: 'The first line carries information, not preamble.' });
  }

  // 2. Filler density.
  const fillerCount = fillers.length - (opensWithFiller ? 1 : 0);
  const per100 = words ? (fillerCount / words) * 100 : 0;
  if (fillerCount > 0) {
    score -= clamp(per100 * 12, 0, 25);
    const kinds = new Set(fillers.map((f) => f.label));
    findings.push({
      id: 'filler', severity: per100 > 1.5 ? 'bad' : 'warn',
      title: `${fillers.length} filler or wordy phrase${fillers.length === 1 ? '' : 's'}`,
      detail: `Examples: ${[...kinds].slice(0, 4).join(', ')}. Every filler word costs reading time and carries no information. Use Tighten to strip them.`,
    });
  } else if (words > 40) {
    findings.push({ id: 'filler', severity: 'good', title: 'No filler detected', detail: 'No stock openers, closers or wordy phrases.' });
  }

  // 3. Sentence length.
  if (r.avgSentenceLength > 22) {
    score -= clamp((r.avgSentenceLength - 22) * 1.5, 0, 15);
    findings.push({
      id: 'sentences', severity: r.avgSentenceLength > 28 ? 'bad' : 'warn',
      title: `Long sentences (avg ${r.avgSentenceLength.toFixed(0)} words)`,
      detail: 'Aim for 12–20 words per sentence. Long sentences make you hold more in working memory and cause re-reading.',
    });
  }
  if (longSentences.length) {
    score -= Math.min(10, longSentences.length * 3);
    findings.push({
      id: 'long-sentences', severity: 'warn',
      title: `${longSentences.length} sentence${longSentences.length === 1 ? '' : 's'} over 30 words`,
      detail: `Split these, e.g. "${longSentences[0].slice(0, 90)}…"`,
    });
  }

  // 4. Paragraph size and structure.
  if (longParagraphs) {
    score -= Math.min(15, longParagraphs * 5);
    findings.push({
      id: 'paragraphs', severity: 'warn',
      title: `${longParagraphs} wall-of-text paragraph${longParagraphs === 1 ? '' : 's'}`,
      detail: 'Paragraphs over 80 words are hard to skim. Keep one idea per paragraph, or turn parallel points into bullets.',
    });
  }
  const scaffolding = headings + bullets + tables;
  if (words > 250 && scaffolding === 0) {
    score -= 15;
    findings.push({
      id: 'structure', severity: 'bad', title: 'No visual structure',
      detail: 'Over 250 words of unbroken prose. Add headings or bullets so the reader can skim to what matters.',
    });
  } else if (words > 150 && headings === 0 && bullets < 3) {
    score -= 6;
    findings.push({
      id: 'structure', severity: 'info', title: 'Light structure',
      detail: 'Consider short headings or a bullet list for the key points.',
    });
  } else if (scaffolding > 0) {
    findings.push({ id: 'structure', severity: 'good', title: 'Skimmable structure', detail: `${headings} heading(s), ${bullets} bullet(s), ${tables} table(s).` });
  }

  // 5. Emphasis: some bold helps scanning, too much is noise.
  const boldPer100 = words ? (boldSpans / words) * 100 : 0;
  if (boldPer100 > 4) {
    score -= 5;
    findings.push({ id: 'bold', severity: 'warn', title: 'Too much bold', detail: 'When everything is emphasised, nothing is. Bold only key terms or decisions.' });
  } else if (words > 200 && boldSpans === 0 && headings === 0) {
    findings.push({ id: 'bold', severity: 'info', title: 'No anchors for the eye', detail: 'Bolding 2–5 key terms gives a skimming reader places to land.' });
  }

  // 6. Length.
  if (words > 600) {
    score -= clamp((words - 600) / 100, 0, 10);
    findings.push({
      id: 'length', severity: 'info', title: `Long response (${words} words)`,
      detail: 'Ask for a TL;DR first and details on request, or set a word budget in your prompt.',
    });
  }

  // 7. Vocabulary difficulty.
  if (r.words > 30 && r.fleschEase < 30) {
    score -= 5;
    findings.push({
      id: 'difficulty', severity: 'warn', title: 'Dense vocabulary',
      detail: `Flesch reading ease ${r.fleschEase.toFixed(0)} (grade ${r.grade.toFixed(0)}). Prefer short, common words where precision allows.`,
    });
  }

  const order: Record<Severity, number> = { bad: 0, warn: 1, info: 2, good: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    words,
    readingSeconds: wpm > 0 ? (words / wpm) * 60 : 0,
    sentences: sentences.length,
    avgSentenceLength: r.avgSentenceLength,
    longSentences,
    paragraphs: paras.length,
    longParagraphs,
    headings,
    bullets,
    codeBlocks,
    tables,
    boldSpans,
    fleschEase: r.fleschEase,
    grade: r.grade,
    fillers,
    score: Math.round(clamp(words === 0 ? 0 : score)),
    findings,
  };
}

export interface TightenResult {
  text: string;
  removedSentences: number;
  replacedPhrases: number;
  wordsBefore: number;
  wordsAfter: number;
}

/**
 * Deterministic clean-up: drops stock openers and closers and rewrites wordy
 * phrases. Code blocks are left untouched.
 */
export function tighten(md: string): TightenResult {
  let removedSentences = 0;
  let replacedPhrases = 0;

  const parts = md.replace(/\r\n?/g, '\n').split(/(```[\s\S]*?```)/g);
  const out = parts.map((part, idx) => {
    if (idx % 2 === 1) return part; // code block
    const lines = part.split('\n').map((line) => {
      const marker = line.match(/^(\s*(?:[-*+]|\d+[.)]|#{1,6}|>)\s+)?/)?.[0] ?? '';
      let body = line.slice(marker.length);

      // Remove filler sentences anywhere in the line.
      let changed = true;
      while (changed) {
        changed = false;
        const starts = [0];
        const re = /[.!?:]\s+/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(body))) starts.push(m.index + m[0].length);
        for (const s of starts) {
          const rest = body.slice(s);
          const rule = SENTENCE_RULES.find((r) => r.pattern.test(rest));
          if (rule) {
            const mm = rule.pattern.exec(rest)!;
            const tail = rest.slice(mm[0].length).replace(/^\s+/, '');
            body = (body.slice(0, s) + tail.charAt(0).toUpperCase() + tail.slice(1)).replace(/\s{2,}/g, ' ');
            removedSentences++;
            changed = true;
            break;
          }
        }
      }

      for (const rule of PHRASE_RULES) {
        rule.pattern.lastIndex = 0;
        body = body.replace(rule.pattern, (match, ...args) => {
          replacedPhrases++;
          const offset = args[args.length - 2] as number;
          const rep = rule.replace ?? '';
          // Keep sentence-initial capitalisation.
          const atStart = offset === 0 || /[.!?]\s*$/.test(body.slice(0, offset));
          if (rep && /^[A-Z]/.test(match)) return rep[0].toUpperCase() + rep.slice(1);
          if (!rep && atStart) return '\u0000CAP';
          return rep;
        });
        body = body.replace(/\u0000CAP(\s*)(\w)/g, (_, sp, c) => sp + c.toUpperCase()).replace(/\u0000CAP/g, '');
      }
      body = body.replace(/ {2,}/g, ' ');
      if (!body.trim() && marker.trim()) return '';
      return marker + body;
    });
    return lines.join('\n');
  });

  const text = out.join('').replace(/\n{3,}/g, '\n\n').trim();
  return {
    text,
    removedSentences,
    replacedPhrases,
    wordsBefore: countWords(md),
    wordsAfter: countWords(text),
  };
}
