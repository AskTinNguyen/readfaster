import { useEffect, useMemo, useRef, useState } from 'react';
import { chunkTokens, displayMs, orpIndex, type Token } from '../lib/text';
import { useBeat, useKeys, useStopwatch } from '../hooks';
import { useApp } from '../state';
import { PlayerBar } from './PlayerBar';

export interface ReadResult {
  seconds: number;
  words: number;
  /** Words actually read divided by active reading time. */
  avgWpm: number;
  finalWpm: number;
  completed: boolean;
}

interface Props {
  tokens: Token[];
  wpm: number;
  chunkSize: number;
  /** Speed ramp: add `step` wpm every `every` words, up to `max`. */
  ramp?: { step: number; every: number; max: number };
  onFinish: (r: ReadResult) => void;
}

/**
 * Rapid Serial Visual Presentation: words appear one chunk at a time in a
 * fixed spot, so the eyes never move and never skip back.
 */
export function RSVP({ tokens, wpm: initialWpm, chunkSize, ramp, onFinish }: Props) {
  const { settings } = useApp();
  const chunks = useMemo(() => chunkTokens(tokens, chunkSize), [tokens, chunkSize]);
  // Cumulative word count at the start of each chunk.
  const starts = useMemo(() => {
    const s: number[] = [];
    let n = 0;
    for (const c of chunks) {
      s.push(n);
      n += c.length;
    }
    return s;
  }, [chunks]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(initialWpm);
  const [done, setDone] = useState(false);
  const watch = useStopwatch();
  const lastRampAt = useRef(0);

  useBeat(playing && settings.beat, settings.beatBpm);

  const finish = (completed: boolean) => {
    if (done) return;
    watch.pause();
    setPlaying(false);
    setDone(true);
    const seconds = watch.elapsed() / 1000;
    const words = completed ? tokens.length : starts[idx] ?? 0;
    onFinish({
      seconds,
      words,
      avgWpm: seconds > 0 ? Math.round(words / (seconds / 60)) : 0,
      finalWpm: wpm,
      completed,
    });
  };

  useEffect(() => {
    if (!playing || done) return;
    const chunk = chunks[idx];
    if (!chunk) return;
    const id = window.setTimeout(() => {
      if (idx + 1 >= chunks.length) {
        finish(true);
        return;
      }
      const next = idx + 1;
      if (ramp && starts[next] - lastRampAt.current >= ramp.every) {
        lastRampAt.current = starts[next];
        setWpm((w) => Math.min(ramp.max, w + ramp.step));
      }
      setIdx(next);
    }, displayMs(chunk, wpm));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx, wpm, chunks, done]);

  const toggle = () => {
    if (done) return;
    if (playing) {
      watch.pause();
      setPlaying(false);
    } else {
      watch.start();
      setPlaying(true);
    }
  };

  const restart = () => {
    watch.reset();
    lastRampAt.current = 0;
    setIdx(0);
    setWpm(initialWpm);
    setPlaying(false);
    setDone(false);
  };

  const skip = (delta: number) => setIdx((i) => Math.max(0, Math.min(chunks.length - 1, i + delta)));

  useKeys((e) => {
    if (e.key === ' ') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(-5); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); skip(5); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setWpm((w) => Math.min(1500, w + 25)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setWpm((w) => Math.max(60, w - 25)); }
    else if (e.key === 'Escape') finish(false);
    else if (e.key === 'r' || e.key === 'R') restart();
  }, !done);

  const chunk = chunks[idx] ?? [];
  const remainingWords = tokens.length - (starts[idx] ?? 0);
  const fontFamily = `var(--font-${settings.font})`;
  const single = chunk.length === 1;

  let display: React.ReactNode;
  if (!playing && idx === 0 && !done) {
    display = <span className="rsvp-ready">Press Start or Space</span>;
  } else if (single && settings.orp) {
    const w = chunk[0].text;
    const p = orpIndex(w);
    display = (
      <span className="rsvp-orp">
        <span className="rsvp-left">{w.slice(0, p)}</span>
        <span className="rsvp-pivot">{w[p]}</span>
        <span className="rsvp-right">{w.slice(p + 1)}</span>
      </span>
    );
  } else {
    display = <span className="rsvp-chunk">{chunk.map((t) => t.text).join(' ')}</span>;
  }

  // While paused mid-way, show the surrounding paragraph for context.
  const paused = !playing && idx > 0 && !done;
  const para = chunk[0]?.para;

  return (
    <div className="rsvp">
      <div
        className={`rsvp-stage${single && settings.orp ? ' with-guides' : ''}`}
        style={{ fontFamily, fontSize: `${Math.round(settings.fontSize * 1.8)}px` }}
        onClick={toggle}
        aria-live="off"
      >
        {display}
      </div>
      {ramp && <div className="muted small center">Speed ramp: +{ramp.step} wpm every {ramp.every} words (max {ramp.max})</div>}
      <PlayerBar
        playing={playing}
        onToggle={toggle}
        onRestart={restart}
        onFinish={() => finish(false)}
        wpm={wpm}
        onWpm={setWpm}
        progress={chunks.length ? idx / chunks.length : 0}
        remainingSeconds={(remainingWords / wpm) * 60 * 1.15}
        onSeek={(f) => setIdx(Math.floor(f * chunks.length))}
      />
      {paused && para != null && (
        <div className="rsvp-context" style={{ fontFamily }}>
          <div className="muted small">Paused. Context:</div>
          <p>
            {tokens.map((t, i) =>
              t.para === para ? (
                <span key={i} className={i >= starts[idx] && i < starts[idx] + chunk.length ? 'hl' : undefined}>
                  {t.text}{' '}
                </span>
              ) : null,
            )}
          </p>
        </div>
      )}
    </div>
  );
}
