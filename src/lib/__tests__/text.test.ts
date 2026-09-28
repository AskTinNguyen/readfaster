import { describe, expect, it } from 'vitest';
import {
  bionicSplit, chunkTokens, countSyllables, countWords, delayMultiplier, formatDuration,
  markdownToPlain, orpIndex, readability, splitSentences, tokenize,
} from '../text';

describe('tokenize', () => {
  it('tracks paragraphs and sentence ends', () => {
    const t = tokenize('Hello world. Next one\n\nSecond para!');
    expect(t.map((x) => x.text)).toEqual(['Hello', 'world.', 'Next', 'one', 'Second', 'para!']);
    expect(t.map((x) => x.para)).toEqual([0, 0, 0, 0, 1, 1]);
    expect(t[1].sentenceEnd).toBe(true);
    expect(t[3].paraEnd).toBe(true);
    expect(t[3].sentenceEnd).toBe(false);
  });

  it('handles CRLF and empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('a\r\n\r\nb').map((x) => x.para)).toEqual([0, 1]);
  });
});

describe('orpIndex', () => {
  it('lands slightly left of centre', () => {
    expect(orpIndex('a')).toBe(0);
    expect(orpIndex('read')).toBe(1);
    expect(orpIndex('reading')).toBe(2);
    expect(orpIndex('comprehension')).toBe(3);
  });
  it('skips leading punctuation', () => {
    expect(orpIndex('"hello')).toBe(2);
  });
});

describe('delayMultiplier', () => {
  it('adds pauses at punctuation', () => {
    const [plain, comma, stop] = tokenize('word word, word.');
    expect(delayMultiplier([plain])).toBe(1);
    expect(delayMultiplier([comma])).toBe(1.5);
    expect(delayMultiplier([stop])).toBeGreaterThan(delayMultiplier([comma]));
  });
});

describe('chunkTokens', () => {
  it('never crosses a sentence boundary', () => {
    const chunks = chunkTokens(tokenize('One two. Three four five six seven.'), 3);
    for (const c of chunks.slice(0, -1)) {
      const inner = c.slice(0, -1);
      expect(inner.some((t) => t.sentenceEnd)).toBe(false);
    }
    expect(chunks[0].map((t) => t.text)).toEqual(['One', 'two.']);
  });

  it('keeps every token in order', () => {
    const tokens = tokenize('The quick brown fox jumps over the lazy dog and runs away from the farmer.');
    const flat = chunkTokens(tokens, 4).flat();
    expect(flat).toEqual(tokens);
  });

  it('avoids ending a chunk on a function word', () => {
    const chunks = chunkTokens(tokenize('results of the experiment were clear'), 3);
    for (const c of chunks.slice(0, -1)) {
      expect(['of', 'the']).not.toContain(c[c.length - 1].text);
    }
  });

  it('size 1 is one token per chunk', () => {
    expect(chunkTokens(tokenize('a b c'), 1)).toHaveLength(3);
  });
});

describe('bionicSplit', () => {
  it('bolds the start of the word', () => {
    expect(bionicSplit('reading')).toEqual(['read', 'ing']);
    expect(bionicSplit('the')).toEqual(['t', 'he']);
    expect(bionicSplit('a')).toEqual(['a', '']);
    expect(bionicSplit('--')).toEqual(['', '--']);
  });
});

describe('readability', () => {
  it('counts syllables roughly', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('reading')).toBe(2);
    expect(countSyllables('comprehension')).toBeGreaterThanOrEqual(4);
  });
  it('splits sentences', () => {
    expect(splitSentences('One. Two! Three? four')).toEqual(['One.', 'Two!', 'Three? four']);
  });
  it('scores simple text as easy', () => {
    const r = readability('The cat sat on the mat. The dog ran to the park.');
    expect(r.sentences).toBe(2);
    expect(r.fleschEase).toBeGreaterThan(80);
  });
});

describe('helpers', () => {
  it('counts words', () => {
    expect(countWords('  one two\nthree ')).toBe(3);
    expect(countWords('   ')).toBe(0);
  });
  it('formats durations', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3700)).toBe('1h 1m');
  });
  it('strips markdown for paced reading', () => {
    const plain = markdownToPlain('# Title\n\n- **Bold** item\n- `code` item\n\n```js\nx()\n```\n\nSee [docs](http://x).');
    expect(plain).not.toMatch(/[#*`]/);
    expect(plain).toContain('Title.');
    expect(plain).toContain('Bold item');
    expect(plain).toContain('[code block]');
    expect(plain).toContain('See docs.');
  });
});
