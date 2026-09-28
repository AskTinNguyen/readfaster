import type { Analysis, Severity } from '../src/lib/analyzer';
import { formatDuration } from '../src/lib/text';

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const ICON: Record<Severity, string> = { bad: '✕', warn: '!', info: 'i', good: '✓' };

/** Plain-text analysis report, used by both the CLI and the MCP tool. */
export function analysisReport(a: Analysis, wpm: number): string {
  const lines = [
    `Fast-read score: ${a.score}/100`,
    `${a.words} words · ~${formatDuration(a.readingSeconds)} at ${wpm} wpm · avg sentence ${a.avgSentenceLength.toFixed(0)} words · reading ease ${a.fleschEase.toFixed(0)} · ${a.headings} headings / ${a.bullets} bullets`,
    '',
    ...a.findings.map((f) => `${ICON[f.severity]} ${f.title}: ${f.detail}`),
  ];
  if (a.fillers.length) {
    const shown = a.fillers.slice(0, 15).map((f) => `"${f.match}" (${f.label})`);
    lines.push('', `Filler found: ${shown.join(', ')}${a.fillers.length > 15 ? `, and ${a.fillers.length - 15} more` : ''}`);
  }
  return lines.join('\n');
}

/** Machine-readable form for `--json`. */
export function analysisJson(a: Analysis) {
  return {
    score: a.score,
    words: a.words,
    readingSeconds: Math.round(a.readingSeconds),
    avgSentenceLength: Math.round(a.avgSentenceLength * 10) / 10,
    fleschEase: Math.round(a.fleschEase),
    headings: a.headings,
    bullets: a.bullets,
    findings: a.findings,
    fillers: a.fillers.map(({ kind, label, match }) => ({ kind, label, match })),
  };
}
