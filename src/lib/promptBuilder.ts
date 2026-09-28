/**
 * Builds reusable instructions that steer AI agents toward output that is
 * fast to read: answer first, skimmable structure, no filler.
 */

export interface Rule {
  id: string;
  label: string;
  why: string;
  /** Instruction line(s) added to the prompt. `{n}` is replaced by the rule's value. */
  text: string;
  /** Optional numeric parameter, e.g. a word budget. */
  value?: { default: number; min: number; max: number; step: number; unit: string };
  defaultOn: boolean;
}

export const RULES: Rule[] = [
  {
    id: 'bluf', defaultOn: true, label: 'Bottom line up front',
    why: 'The first sentence is the one you always read. Put the answer there.',
    text: 'Start with the answer, decision or result in the first sentence. Put supporting detail after it.',
  },
  {
    id: 'tldr', defaultOn: false, label: 'TL;DR line for long answers',
    why: 'Lets you decide in five seconds whether to read the rest.',
    text: 'If the response is longer than {n} words, begin with a one-line "TL;DR:" summary.',
    value: { default: 150, min: 50, max: 500, step: 50, unit: 'words' },
  },
  {
    id: 'no-filler', defaultOn: true, label: 'No preamble or sign-off',
    why: 'Openers like "Great question!" and closers like "Hope this helps" cost time and carry nothing.',
    text: 'Do not open with acknowledgements, praise or a restatement of the question. Do not close with offers of further help or a recap of what you just said.',
  },
  {
    id: 'budget', defaultOn: true, label: 'Word budget',
    why: 'Length is the biggest driver of reading time. A budget forces prioritisation.',
    text: 'Keep responses under {n} words unless I ask for more detail. Prefer cutting low-value content over compressing everything.',
    value: { default: 250, min: 50, max: 1500, step: 50, unit: 'words' },
  },
  {
    id: 'short-sentences', defaultOn: true, label: 'Short sentences',
    why: 'Sentences over ~25 words overload working memory and cause re-reading.',
    text: 'Use short sentences (under {n} words) and plain, common words. Use active voice.',
    value: { default: 20, min: 10, max: 35, step: 1, unit: 'words' },
  },
  {
    id: 'short-paragraphs', defaultOn: true, label: 'One idea per paragraph',
    why: 'Short blocks give the eye a place to land and make skimming possible.',
    text: 'Keep paragraphs to one idea and at most {n} sentences.',
    value: { default: 3, min: 1, max: 6, step: 1, unit: 'sentences' },
  },
  {
    id: 'bullets', defaultOn: true, label: 'Bullets for parallel items',
    why: 'Lists can be scanned vertically, which is much faster than parsing prose.',
    text: 'Use bullet lists for three or more parallel items, options or steps. Use numbered lists for sequences. Start each bullet with its key word or phrase.',
  },
  {
    id: 'headings', defaultOn: true, label: 'Headings on long answers',
    why: 'Headings let you jump straight to the part you need.',
    text: 'For responses longer than {n} words, add short descriptive headings.',
    value: { default: 300, min: 100, max: 1000, step: 50, unit: 'words' },
  },
  {
    id: 'bold', defaultOn: true, label: 'Bold sparingly',
    why: 'A few bold anchors speed up skimming; too many become noise.',
    text: 'Bold only the few terms, numbers or decisions a skimming reader must not miss (at most one per paragraph).',
  },
  {
    id: 'tables', defaultOn: true, label: 'Tables for comparisons',
    why: 'Comparisons in prose force you to build the table in your head.',
    text: 'When comparing options across the same attributes, use a compact table instead of prose.',
  },
  {
    id: 'confidence', defaultOn: false, label: 'Explicit confidence, no hedging',
    why: 'Scattered "might", "could potentially" and "it seems" slow reading and hide what is actually uncertain.',
    text: 'Do not hedge sentence by sentence. State claims plainly, and flag real uncertainty once, explicitly (e.g. "Unverified:" or "Confidence: medium, because ...").',
  },
  {
    id: 'actions', defaultOn: false, label: 'Action items at the end',
    why: 'You should never have to hunt through prose for what you need to do.',
    text: 'If I need to do anything, end with a short "Next steps" list of concrete actions.',
  },
  {
    id: 'progressive', defaultOn: false, label: 'Progressive disclosure',
    why: 'Get the core first and pull detail only when you need it.',
    text: 'Give the essential answer first. Put edge cases, background and alternatives in a clearly labelled final section, or offer them in one line instead of writing them out.',
  },
  {
    id: 'code-first', defaultOn: false, label: 'Code and diffs first',
    why: 'For coding tasks, the change is the answer; the narration is secondary.',
    text: 'For code changes, show the code or diff first, then at most {n} bullets explaining what changed and why. Do not narrate each step you took.',
    value: { default: 3, min: 1, max: 8, step: 1, unit: 'bullets' },
  },
];

export interface Preset {
  id: string;
  label: string;
  description: string;
  rules: Record<string, boolean>;
  values?: Record<string, number>;
  extra?: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'chat', label: 'Everyday chat', description: 'Quick, direct answers for questions and explanations.',
    rules: { bluf: true, 'no-filler': true, budget: true, 'short-sentences': true, 'short-paragraphs': true, bullets: true, bold: true, tables: true },
    values: { budget: 200 },
  },
  {
    id: 'coding', label: 'Coding agent', description: 'Summaries of work done by a coding agent.',
    rules: { bluf: true, 'no-filler': true, budget: true, bullets: true, 'code-first': true, actions: true, confidence: true, 'short-sentences': true },
    values: { budget: 200 },
    extra: 'When reporting finished work, use this shape: one-line outcome; what changed (bullets, file paths in backticks); anything I must check or decide. Say plainly if tests failed or something was skipped.',
  },
  {
    id: 'research', label: 'Research report', description: 'Longer findings you need to scan and retain.',
    rules: { bluf: true, tldr: true, 'no-filler': true, 'short-sentences': true, 'short-paragraphs': true, bullets: true, headings: true, bold: true, tables: true, confidence: true, progressive: true },
    values: { tldr: 100, headings: 250 },
    extra: 'Structure: TL;DR, key findings (bulleted, most important first), evidence, open questions.',
  },
  {
    id: 'status', label: 'Status update', description: 'Progress reports you read many times a day.',
    rules: { bluf: true, 'no-filler': true, budget: true, bullets: true, actions: true, bold: true },
    values: { budget: 120 },
    extra: 'Structure: status in one word (Done / On track / Blocked) and one sentence, then Changes, Blockers and Next steps as short bullet lists. Omit empty sections.',
  },
];

export type Target = 'system' | 'claude-md' | 'custom-instructions' | 'inline';

export const TARGETS: { id: Target; label: string; hint: string }[] = [
  { id: 'system', label: 'System prompt', hint: 'Paste into an API system prompt or an agent definition.' },
  { id: 'claude-md', label: 'CLAUDE.md / AGENTS.md', hint: 'Add to your repo so coding agents follow it on every task.' },
  { id: 'custom-instructions', label: 'Chat custom instructions', hint: 'Paste into your chat app\'s personal preferences / custom instructions.' },
  { id: 'inline', label: 'One-off message', hint: 'Prepend to a single request.' },
];

export interface BuildOptions {
  enabled: Record<string, boolean>;
  values: Record<string, number>;
  target: Target;
  extra?: string;
}

export function defaultOptions(): BuildOptions {
  const enabled: Record<string, boolean> = {};
  const values: Record<string, number> = {};
  for (const r of RULES) {
    enabled[r.id] = r.defaultOn;
    if (r.value) values[r.id] = r.value.default;
  }
  return { enabled, values, target: 'system' };
}

export function applyPreset(preset: Preset, target: Target): BuildOptions {
  const base = defaultOptions();
  const enabled: Record<string, boolean> = {};
  for (const r of RULES) enabled[r.id] = !!preset.rules[r.id];
  return { enabled, values: { ...base.values, ...preset.values }, target, extra: preset.extra };
}

export function ruleLine(rule: Rule, values: Record<string, number>): string {
  const n = values[rule.id] ?? rule.value?.default ?? 0;
  return rule.text.replace(/\{n\}/g, String(n));
}

export function buildPrompt(opts: BuildOptions): string {
  const lines = RULES.filter((r) => opts.enabled[r.id]).map((r) => `- ${ruleLine(r, opts.values)}`);
  const extra = opts.extra?.trim();
  if (!lines.length && !extra) return '';

  const body = [...lines, ...(extra ? [`- ${extra}`] : [])].join('\n');
  switch (opts.target) {
    case 'system':
      return `# Response style\nI read a lot of AI-generated text and need to process it quickly without missing key information. Write every response for fast reading:\n\n${body}`;
    case 'claude-md':
      return `## Communication style\n\nThe reader skims many agent reports a day. Optimise every message, summary and final report for fast reading:\n\n${body}`;
    case 'custom-instructions':
      return `I skim a lot of AI output, so optimise responses for fast reading:\n${body}`;
    case 'inline':
      return `Answer in a fast-to-read format:\n${body}\n\n---\n`;
  }
}

export interface SteeringCommand {
  label: string;
  when: string;
  prompt: string;
}

/** Follow-up messages that reshape a response you already got. */
export const STEERING: SteeringCommand[] = [
  { label: 'TL;DR', when: 'The answer is long and you only need the gist.', prompt: 'Give me a TL;DR of your last response in 3 bullets, most important first.' },
  { label: 'Just the decision', when: 'You asked for a recommendation and got an essay.', prompt: 'What is your recommendation, in one sentence, and the single strongest reason for it?' },
  { label: 'Table it', when: 'Options are compared in paragraphs.', prompt: 'Rewrite the comparison as a table: one row per option, columns for the attributes that matter. No prose.' },
  { label: 'What do I do?', when: 'The next step is buried somewhere.', prompt: 'List only what I need to do next, as numbered steps. Nothing else.' },
  { label: 'Cut by half', when: 'The content is right but too wordy.', prompt: 'Rewrite your last response at half the length. Keep every fact and number; cut filler, repetition and hedging.' },
  { label: 'What changed?', when: 'A coding agent narrated its whole process.', prompt: 'Summarise what you actually changed: files touched and one line per change. Then list anything that failed or you skipped.' },
  { label: 'Flag the risky bits', when: 'You need to review agent work quickly.', prompt: 'Which parts of this are you least confident about, or most likely to be wrong? List them, most important first.' },
  { label: 'Explain like a headline', when: 'A concept explanation is too abstract.', prompt: 'Explain it again as: a one-line headline, a concrete example, and the one thing people usually get wrong.' },
];
