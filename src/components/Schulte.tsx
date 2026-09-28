import { useEffect, useState } from 'react';
import { schulteGrid } from '../lib/drills';
import { useApp } from '../state';

/**
 * Schulte table: find 1..N in order while keeping your eyes on the centre.
 * Trains peripheral awareness, the basis of taking in several words per glance.
 */
export function Schulte() {
  const { addSession, history } = useApp();
  const [size, setSize] = useState(5);
  const [grid, setGrid] = useState(() => schulteGrid(5));
  const [next, setNext] = useState(1);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [miss, setMiss] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const total = size * size;

  useEffect(() => {
    if (startedAt == null || result != null) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [startedAt, result]);

  const reset = (s = size) => {
    setSize(s);
    setGrid(schulteGrid(s));
    setNext(1);
    setStartedAt(null);
    setResult(null);
    setErrors(0);
  };

  const click = (n: number) => {
    if (result != null) return;
    if (n !== next) {
      setMiss(n);
      setErrors((e) => e + 1);
      window.setTimeout(() => setMiss(null), 250);
      return;
    }
    const start = startedAt ?? performance.now();
    if (startedAt == null) setStartedAt(start);
    if (n === total) {
      const secs = (performance.now() - start) / 1000;
      setResult(secs);
      addSession({ mode: 'schulte', score: Math.round(secs * 10) / 10, seconds: secs, note: `${size}x${size}, ${errors} errors` });
    }
    setNext(n + 1);
  };

  const best = history
    .filter((r) => r.mode === 'schulte' && r.note?.startsWith(`${size}x${size}`))
    .reduce<number | null>((b, r) => (b == null || (r.score ?? Infinity) < b ? r.score ?? b : b), null);

  const elapsed = result ?? (startedAt != null ? (now - startedAt) / 1000 : 0);

  return (
    <div className="drill">
      <div className="drill-bar">
        <div className="seg" role="group" aria-label="Grid size">
          {[3, 4, 5, 6].map((s) => (
            <button key={s} className={s === size ? 'on' : ''} onClick={() => reset(s)}>{s}×{s}</button>
          ))}
        </div>
        <span>Find: <strong className="big">{Math.min(next, total)}</strong></span>
        <span className="mono">{elapsed.toFixed(1)}s</span>
        {best != null && <span className="muted small">best {best}s</span>}
        <button className="btn" onClick={() => reset()}>New grid</button>
      </div>
      <p className="muted small">
        Keep your eyes on the centre dot. Click 1, 2, 3… using only your peripheral vision. Don't move your eyes to hunt.
      </p>
      <div className="schulte" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {grid.map((n) => (
          <button
            key={n}
            className={`cell${n < next ? ' found' : ''}${miss === n ? ' miss' : ''}`}
            onClick={() => click(n)}
          >
            {n}
          </button>
        ))}
        <span className="fixation" aria-hidden />
      </div>
      {result != null && (
        <div className="callout good">
          Done in <strong>{result.toFixed(1)}s</strong> with {errors} error{errors === 1 ? '' : 's'}.
          {' '}A 5×5 grid under 25s is good; under 15s is excellent.
          <button className="btn primary" onClick={() => reset()}>Again</button>
        </div>
      )}
    </div>
  );
}
