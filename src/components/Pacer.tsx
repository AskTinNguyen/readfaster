import { useEffect, useMemo, useRef, useState } from 'react';
import { bionicSplit, chunkTokens, displayMs, type Token } from '../lib/text';
import { useBeat, useKeys, useStopwatch } from '../hooks';
import { useApp } from '../state';
import { PlayerBar } from './PlayerBar';
import type { ReadResult } from './RSVP';

type Guide = 'highlight' | 'underline' | 'window';

interface Props {
  tokens: Token[];
  wpm: number;
  chunkSize: number;
  onFinish: (r: ReadResult) => void;
}

/**
 * A visual pacer: the full text stays on the page and a guide sweeps across
 * it at the target speed, like running a finger under the line.
 */
export function Pacer({ tokens, wpm: initialWpm, chunkSize, onFinish }: Props) {
  const { settings, updateSettings } = useApp();
  const chunks = useMemo(() => chunkTokens(tokens, chunkSize), [tokens, chunkSize]);
  const bounds = useMemo(() => {
    const b: [number, number][] = [];
    let n = 0;
    for (const c of chunks) {
      b.push([n, n + c.length]);
      n += c.length;
    }
    return b;
  }, [chunks]);

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(initialWpm);
  const [done, setDone] = useState(false);
  const [guide, setGuide] = useState<Guide>('highlight');
  const watch = useStopwatch();
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLSpanElement>(null);

  useBeat(playing && settings.beat, settings.beatBpm);

  const finish = (completed: boolean) => {
    if (done) return;
    watch.pause();
    setPlaying(false);
    setDone(true);
    const seconds = watch.elapsed() / 1000;
    const words = completed ? tokens.length : bounds[idx]?.[0] ?? 0;
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
      if (idx + 1 >= chunks.length) finish(true);
      else setIdx(idx + 1);
    }, displayMs(chunk, wpm));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, idx, wpm, chunks, done]);

  // Keep the guide in the upper-middle of the reading area.
  useEffect(() => {
    const box = scroller.current;
    const el = current.current;
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    const target = top - box.clientHeight * 0.35;
    if (Math.abs(box.scrollTop - target) > box.clientHeight * 0.2) {
      box.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, [idx]);

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
    setIdx(0);
    setWpm(initialWpm);
    setPlaying(false);
    setDone(false);
    scroller.current?.scrollTo({ top: 0 });
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

  const [curStart, curEnd] = bounds[idx] ?? [0, 0];
  const started = playing || idx > 0;

  // Group tokens by paragraph for rendering.
  const paras = useMemo(() => {
    const out: { i: number; t: Token }[][] = [];
    tokens.forEach((t, i) => {
      (out[t.para] ??= []).push({ i, t });
    });
    return out;
  }, [tokens]);

  const curPara = tokens[curStart]?.para ?? 0;

  return (
    <div className="pacer">
      <div
        ref={scroller}
        className={`pacer-text guide-${guide}${started ? ' started' : ''}${settings.fadeRead ? ' fade-read' : ''}`}
        style={{ fontFamily: `var(--font-${settings.font})`, fontSize: `${settings.fontSize}px` }}
      >
        {paras.map((words, pi) => (
          <p key={pi} className={guide === 'window' && started && pi !== curPara ? 'dim' : undefined}>
            {words.map(({ i, t }) => {
              const isCur = started && i >= curStart && i < curEnd;
              const cls = !started ? '' : isCur ? 'cur' : i < curStart ? 'read' : 'ahead';
              let content: React.ReactNode = t.text;
              if (settings.bionic) {
                const [b, rest] = bionicSplit(t.text);
                content = (<><b>{b}</b>{rest}</>);
              }
              return (
                <span key={i} ref={isCur && i === curStart ? current : undefined} className={cls}>
                  {content}{' '}
                </span>
              );
            })}
          </p>
        ))}
      </div>
      <PlayerBar
        playing={playing}
        onToggle={toggle}
        onRestart={restart}
        onFinish={() => finish(false)}
        wpm={wpm}
        onWpm={setWpm}
        progress={chunks.length ? idx / chunks.length : 0}
        remainingSeconds={((tokens.length - curStart) / wpm) * 60 * 1.15}
        onSeek={(f) => setIdx(Math.floor(f * chunks.length))}
        extra={
          <div className="seg small" role="group" aria-label="Guide style">
            {(['highlight', 'underline', 'window'] as Guide[]).map((g) => (
              <button key={g} className={guide === g ? 'on' : ''} onClick={() => setGuide(g)}>{g}</button>
            ))}
            <button
              className={settings.fadeRead ? 'on' : ''}
              onClick={() => updateSettings({ fadeRead: !settings.fadeRead })}
              title="Fade words you've passed so you don't skip back"
            >fade read</button>
          </div>
        }
      />
    </div>
  );
}
