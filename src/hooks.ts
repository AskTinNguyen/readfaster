import { useCallback, useEffect, useRef, useState } from 'react';

/** Current location hash as a route, e.g. "#/train" -> "train". */
export function useRoute(): [string, (r: string) => void] {
  const get = () => window.location.hash.replace(/^#\/?/, '') || 'home';
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => {
      setRoute(get());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((r: string) => {
    window.location.hash = `/${r}`;
  }, []);
  return [route, go];
}

/**
 * Plays a soft tick at a steady tempo. Humming or tapping along keeps the
 * inner voice busy, which makes it harder to sound out every word.
 */
export function useBeat(enabled: boolean, bpm: number) {
  useEffect(() => {
    if (!enabled) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    let beat = 0;
    const tick = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = beat % 4 === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      beat++;
    };
    const id = window.setInterval(tick, 60000 / Math.max(30, bpm));
    return () => {
      window.clearInterval(id);
      void ctx.close();
    };
  }, [enabled, bpm]);
}

/** Global keyboard shortcuts, ignored while typing in a form field. */
export function useKeys(handler: (e: KeyboardEvent) => void, active = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      ref.current(e);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [active]);
}

/**
 * A stopwatch that only counts time while running, so pauses don't lower
 * the measured reading speed.
 */
export function useStopwatch() {
  const acc = useRef(0);
  const startedAt = useRef<number | null>(null);
  const start = useCallback(() => {
    if (startedAt.current == null) startedAt.current = performance.now();
  }, []);
  const pause = useCallback(() => {
    if (startedAt.current != null) {
      acc.current += performance.now() - startedAt.current;
      startedAt.current = null;
    }
  }, []);
  const reset = useCallback(() => {
    acc.current = 0;
    startedAt.current = null;
  }, []);
  const elapsed = useCallback(
    () => acc.current + (startedAt.current != null ? performance.now() - startedAt.current : 0),
    [],
  );
  return { start, pause, reset, elapsed };
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text) && done());
    } else if (fallbackCopy(text)) done();
  }, []);
  return [copied, copy];
}

function fallbackCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
