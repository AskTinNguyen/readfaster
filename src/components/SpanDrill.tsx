import { useEffect, useRef, useState } from 'react';
import { scoreRecall, spanWords } from '../lib/drills';
import { useApp } from '../state';

const ROUNDS = 10;

type Phase = 'idle' | 'focus' | 'flash' | 'answer' | 'feedback' | 'done';

/**
 * Flash-span drill: a row of words flashes around a fixation point for a
 * fraction of a second, then you type what you saw. The row grows when you
 * get it right and shrinks when you don't.
 */
export function SpanDrill() {
  const { addSession } = useApp();
  const [span, setSpan] = useState(2);
  const [flashMs, setFlashMs] = useState(300);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [lastScore, setLastScore] = useState(0);
  const [maxSpan, setMaxSpan] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (phase === 'focus') {
      const id = window.setTimeout(() => setPhase('flash'), 700);
      return () => window.clearTimeout(id);
    }
    if (phase === 'flash') {
      const id = window.setTimeout(() => setPhase('answer'), flashMs);
      return () => window.clearTimeout(id);
    }
    if (phase === 'answer') input.current?.focus();
  }, [phase, flashMs]);

  const startRound = (n = span) => {
    setWords(spanWords(n));
    setAnswer('');
    setPhase('focus');
  };

  const begin = () => {
    startedAt.current = performance.now();
    setRound(1);
    setScores([]);
    setMaxSpan(0);
    startRound(span);
  };

  const submit = () => {
    const s = scoreRecall(words, answer);
    setLastScore(s);
    setScores((a) => [...a, s]);
    if (s === 1) setMaxSpan((m) => Math.max(m, words.length));
    setPhase('feedback');
  };

  const next = () => {
    const nextSpan = lastScore === 1 ? Math.min(7, span + 1) : lastScore < 0.5 ? Math.max(1, span - 1) : span;
    setSpan(nextSpan);
    if (round >= ROUNDS) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      addSession({
        mode: 'span',
        score: maxSpan,
        comprehension: avg,
        seconds: (performance.now() - startedAt.current) / 1000,
        note: `${flashMs}ms flash`,
      });
      setPhase('done');
      return;
    }
    setRound((r) => r + 1);
    startRound(nextSpan);
  };

  return (
    <div className="drill">
      <div className="drill-bar">
        <label>
          Flash time
          <select value={flashMs} onChange={(e) => setFlashMs(+e.target.value)} disabled={phase !== 'idle' && phase !== 'done'}>
            {[500, 400, 300, 200, 150, 100].map((ms) => <option key={ms} value={ms}>{ms} ms</option>)}
          </select>
        </label>
        <span>Span: <strong>{span}</strong> word{span === 1 ? '' : 's'}</span>
        {round > 0 && phase !== 'done' && <span className="muted">Round {round}/{ROUNDS}</span>}
      </div>
      <p className="muted small">
        Fix your eyes on the dot. Words flash on both sides; take them in as one glance, then type them in any order.
      </p>

      <div className="span-stage">
        {phase === 'flash' ? (
          <div className="span-words" style={{ gap: `${1 + span * 0.6}em` }}>
            {words.map((w, i) => <span key={i}>{w}</span>)}
          </div>
        ) : phase === 'focus' ? (
          <span className="fixation-dot" />
        ) : phase === 'answer' ? (
          <form className="span-answer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <input ref={input} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the words you saw" />
            <button className="btn primary" type="submit">Check</button>
          </form>
        ) : phase === 'feedback' ? (
          <div className="span-feedback">
            <div className={lastScore === 1 ? 'ok' : 'bad'}>
              {Math.round(lastScore * words.length)}/{words.length}: {words.join(' · ')}
            </div>
            <button className="btn primary" onClick={next} autoFocus>
              {round >= ROUNDS ? 'Finish' : 'Next'}
            </button>
          </div>
        ) : phase === 'done' ? (
          <div className="span-feedback">
            <div>
              Best clean span: <strong>{maxSpan || '—'}</strong> words at {flashMs} ms.
              Average recall {Math.round((scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)) * 100)}%.
            </div>
            <button className="btn primary" onClick={begin}>Go again</button>
          </div>
        ) : (
          <button className="btn primary" onClick={begin}>Start {ROUNDS} rounds</button>
        )}
      </div>
    </div>
  );
}
