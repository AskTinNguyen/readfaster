import { describe, expect, it } from 'vitest';
import { recommendWpm, summarize, type SessionRecord } from '../storage';

const rec = (p: Partial<SessionRecord>): SessionRecord => ({ id: Math.random().toString(), date: new Date().toISOString(), mode: 'pacer', ...p });

describe('recommendWpm', () => {
  it('keeps the current speed with no history', () => {
    expect(recommendWpm([], 300)).toBe(300);
  });
  it('speeds up when comprehension is high', () => {
    expect(recommendWpm([rec({ wpm: 300, comprehension: 1 })], 300)).toBe(330);
  });
  it('slows down when comprehension is low', () => {
    expect(recommendWpm([rec({ wpm: 400, comprehension: 0.2 })], 400)).toBe(340);
  });
  it('clamps to a sane range', () => {
    expect(recommendWpm([rec({ wpm: 1200, comprehension: 1 })], 1200)).toBe(1200);
  });
});

describe('summarize', () => {
  it('computes baseline, effective speed and streak', () => {
    const now = new Date('2026-09-28T12:00:00');
    const day = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
    const h: SessionRecord[] = [
      rec({ mode: 'test', wpm: 220, comprehension: 0.8, date: day(2), seconds: 120 }),
      rec({ mode: 'pacer', wpm: 300, comprehension: 0.6, date: day(1), seconds: 60 }),
      rec({ mode: 'test', wpm: 260, comprehension: 1, date: day(0), seconds: 60 }),
    ];
    const s = summarize(h, now);
    expect(s.baselineWpm).toBe(220);
    expect(s.latestWpm).toBe(260);
    expect(s.bestEffectiveWpm).toBe(260);
    expect(s.streakDays).toBe(3);
    expect(s.minutesTrained).toBe(4);
  });

  it('keeps a streak alive before today\'s session', () => {
    const now = new Date('2026-09-28T08:00:00');
    const y = new Date('2026-09-27T20:00:00').toISOString();
    expect(summarize([rec({ date: y })], now).streakDays).toBe(1);
  });
});

import { isRecordable } from '../storage';
describe('isRecordable', () => {
  it('rejects aborted and implausible sessions', () => {
    expect(isRecordable({ words: 10, avgWpm: 250 })).toBe(false);
    expect(isRecordable({ words: 400, avgWpm: 16000 })).toBe(false);
    expect(isRecordable({ words: 400, avgWpm: 320 })).toBe(true);
  });
});
