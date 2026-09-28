/**
 * Local persistence for settings and training history. Everything stays in
 * the browser; storage failures (private mode, quota) degrade to in-memory.
 */

export type SessionMode = 'test' | 'rsvp' | 'pacer' | 'chunk' | 'ramp' | 'span' | 'schulte';

export interface SessionRecord {
  id: string;
  date: string; // ISO
  mode: SessionMode;
  /** Words per minute actually achieved (or presented, for paced drills). */
  wpm?: number;
  /** 0..1 */
  comprehension?: number;
  words?: number;
  seconds?: number;
  passageId?: string;
  /** Drill-specific score, e.g. span length or Schulte time. */
  score?: number;
  note?: string;
}

export interface Settings {
  wpm: number;
  chunkSize: number;
  font: 'sans' | 'serif' | 'mono';
  fontSize: number;
  theme: 'system' | 'light' | 'dark';
  /** Show the optimal-recognition-point letter in RSVP. */
  orp: boolean;
  /** Fade text the pacer has already passed, to discourage back-skipping. */
  fadeRead: boolean;
  /** Soft metronome beat to occupy the inner voice. */
  beat: boolean;
  beatBpm: number;
  bionic: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  chunkSize: 1,
  font: 'sans',
  fontSize: 20,
  theme: 'system',
  orp: true,
  fadeRead: true,
  beat: false,
  beatBpm: 100,
  bionic: false,
};

const KEY_SETTINGS = 'readfaster.settings.v1';
const KEY_HISTORY = 'readfaster.history.v1';
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

export function loadSettings(): Settings {
  try {
    const raw = read(KEY_SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  write(KEY_SETTINGS, JSON.stringify(s));
}

export function loadHistory(): SessionRecord[] {
  try {
    const raw = read(KEY_HISTORY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(h: SessionRecord[]) {
  write(KEY_HISTORY, JSON.stringify(h));
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Sessions this short or this fast are noise (an aborted run, or skimming) and are not saved. */
export const MIN_SESSION_WORDS = 30;
export const MAX_PLAUSIBLE_WPM = 1500;

export function isRecordable(r: { words: number; avgWpm: number }): boolean {
  return r.words >= MIN_SESSION_WORDS && r.avgWpm > 0 && r.avgWpm <= MAX_PLAUSIBLE_WPM;
}

/** Speed weighted by understanding: reading fast is worthless if nothing sticks. */
export function effectiveWpm(r: SessionRecord): number | undefined {
  if (r.wpm == null) return undefined;
  return r.comprehension == null ? undefined : Math.round(r.wpm * r.comprehension);
}

export interface Summary {
  baselineWpm?: number;
  latestWpm?: number;
  bestEffectiveWpm?: number;
  latestEffectiveWpm?: number;
  avgComprehension?: number;
  sessions: number;
  minutesTrained: number;
  streakDays: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function summarize(history: SessionRecord[], now = new Date()): Summary {
  const tests = history.filter((r) => r.mode === 'test' && r.wpm);
  const withComp = history.filter((r) => r.comprehension != null && r.wpm);
  const eff = withComp.map((r) => effectiveWpm(r)!).filter((v) => v != null);

  const days = new Set(history.map((r) => dayKey(new Date(r.date))));
  let streak = 0;
  const cursor = new Date(now);
  // A streak survives if today has no session yet but yesterday does.
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    baselineWpm: tests[0]?.wpm,
    latestWpm: tests[tests.length - 1]?.wpm,
    bestEffectiveWpm: eff.length ? Math.max(...eff) : undefined,
    latestEffectiveWpm: withComp.length ? effectiveWpm(withComp[withComp.length - 1]) : undefined,
    avgComprehension: withComp.length
      ? withComp.reduce((s, r) => s + (r.comprehension ?? 0), 0) / withComp.length
      : undefined,
    sessions: history.length,
    minutesTrained: Math.round(history.reduce((s, r) => s + (r.seconds ?? 0), 0) / 60),
    streakDays: streak,
  };
}

/**
 * Suggests the next training speed. Push ~10% faster while comprehension
 * holds at 70%+, back off when it drops.
 */
export function recommendWpm(history: SessionRecord[], current: number): number {
  const recent = history.filter((r) => r.comprehension != null && r.wpm).slice(-3);
  if (!recent.length) return current;
  const avg = recent.reduce((s, r) => s + r.comprehension!, 0) / recent.length;
  const last = recent[recent.length - 1].wpm!;
  let next = last;
  if (avg >= 0.8) next = last * 1.1;
  else if (avg >= 0.7) next = last * 1.05;
  else if (avg < 0.5) next = last * 0.85;
  else next = last * 0.95;
  return Math.max(100, Math.min(1200, Math.round(next / 10) * 10));
}
