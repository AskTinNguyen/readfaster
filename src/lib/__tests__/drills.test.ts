import { describe, expect, it } from 'vitest';
import { schulteGrid, scoreRecall, spanWords } from '../drills';
import { PASSAGES } from '../../data/passages';

describe('drills', () => {
  it('builds a Schulte grid with every number once', () => {
    const g = schulteGrid(5);
    expect([...g].sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
  it('returns distinct span words', () => {
    const w = spanWords(7);
    expect(new Set(w).size).toBe(7);
  });
  it('scores recall in any order, ignoring case', () => {
    expect(scoreRecall(['river', 'Garden'], 'garden, RIVER')).toBe(1);
    expect(scoreRecall(['river', 'garden'], 'river')).toBe(0.5);
  });
});

describe('passages', () => {
  it('are well formed', () => {
    const ids = new Set<string>();
    for (const p of PASSAGES) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.questions.length).toBeGreaterThanOrEqual(3);
      for (const q of p.questions) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
  });
});
