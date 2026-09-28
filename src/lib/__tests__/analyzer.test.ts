import { describe, expect, it } from 'vitest';
import { analyze, splitBlocks, tighten } from '../analyzer';
import { SAMPLES } from '../../data/samples';

const verbose = SAMPLES.find((s) => s.id === 'verbose-coding')!.text;
const tight = SAMPLES.find((s) => s.id === 'tight-coding')!.text;

describe('splitBlocks', () => {
  it('recognises markdown block types', () => {
    const blocks = splitBlocks('# Head\n\nPara line one\nline two\n\n- a\n- b\n\n```\ncode\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'para', 'list', 'code', 'table']);
  });
  it('keeps source offsets', () => {
    const src = 'Intro.\n\n## Next';
    const blocks = splitBlocks(src);
    expect(src.slice(blocks[1].start)).toBe('## Next');
  });
});

describe('analyze', () => {
  it('scores the verbose sample lower than the tight one', () => {
    const a = analyze(verbose);
    const b = analyze(tight);
    expect(a.score).toBeLessThan(b.score);
    expect(b.score).toBeGreaterThanOrEqual(80);
    expect(a.score).toBeLessThan(60);
  });

  it('flags a buried answer and filler', () => {
    const a = analyze(verbose);
    const ids = a.findings.map((f) => f.id);
    expect(a.findings.find((f) => f.id === 'bluf')?.severity).toBe('bad');
    expect(ids).toContain('filler');
    const labels = a.fillers.map((f) => f.label);
    expect(labels).toContain('Compliment opener');
    expect(labels).toContain('"Hope this helps" closer');
    expect(labels).toContain('Wordy phrase');
  });

  it('reports filler offsets that point at the matched text', () => {
    const src = 'The fix works.\n\nIn order to deploy, run the script. I hope this helps!';
    const a = analyze(src);
    for (const f of a.fillers) {
      expect(src.slice(f.index, f.index + f.match.length).toLowerCase()).toBe(f.match.toLowerCase());
    }
  });

  it('ignores filler inside code blocks', () => {
    const a = analyze('Run this:\n\n```\n// in order to basically test\n```');
    expect(a.fillers).toHaveLength(0);
  });

  it('returns 0 for empty input', () => {
    expect(analyze('').score).toBe(0);
  });
});

describe('tighten', () => {
  it('removes openers and closers and shortens wordy phrases', () => {
    const r = tighten(verbose);
    expect(r.text).not.toMatch(/Great question/);
    expect(r.text).not.toMatch(/I hope this helps/);
    expect(r.text).not.toMatch(/Let me know/);
    expect(r.text).not.toMatch(/in order to/i);
    expect(r.text).toMatch(/because the lockfile/);
    expect(r.wordsAfter).toBeLessThan(r.wordsBefore);
    // Facts survive.
    expect(r.text).toContain('412 tests');
  });

  it('keeps capitalisation after removing a leading phrase', () => {
    expect(tighten("It's worth noting that the cache is cold.").text).toBe('The cache is cold.');
    expect(tighten('Certainly! The answer is 4.').text).toBe('The answer is 4.');
  });

  it('does not change meaning around negations', () => {
    expect(tighten('This is not very fast.').text).toBe('This is not very fast.');
  });

  it('leaves code blocks untouched', () => {
    const src = 'Text.\n\n```\nin order to basically\n```';
    expect(tighten(src).text).toContain('in order to basically');
  });

  it('preserves list markers', () => {
    expect(tighten('- In order to build, run make.\n- Done').text).toBe('- To build, run make.\n- Done');
  });
});
