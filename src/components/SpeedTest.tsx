import { useEffect, useState } from 'react';
import { useKeys, useStopwatch } from '../hooks';
import { useApp } from '../state';
import type { ReadResult } from './RSVP';

interface Props {
  text: string;
  words: number;
  onFinish: (r: ReadResult) => void;
}

/** Plain, unassisted reading with a stopwatch: the honest baseline. */
export function SpeedTest({ text, words, onFinish }: Props) {
  const { settings } = useApp();
  const watch = useStopwatch();
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    watch.start();
    setRunning(true);
  };
  const done = () => {
    watch.pause();
    setRunning(false);
    const seconds = watch.elapsed() / 1000;
    onFinish({ seconds, words, avgWpm: Math.round(words / (seconds / 60)), finalWpm: 0, completed: true });
  };

  useKeys((e) => {
    if (e.key === ' ' && !running) { e.preventDefault(); start(); }
    else if ((e.key === 'Enter' || e.key === 'Escape') && running) { e.preventDefault(); done(); }
  });

  if (!running) {
    return (
      <div className="speedtest-intro">
        <p>Read at your normal pace, the way you'd read something you need to understand. Don't skim. A short quiz follows.</p>
        <p className="muted small">The text appears when you press Start and the timer runs until you press Done.</p>
        <button className="btn primary lg" onClick={start}>Start reading</button>
      </div>
    );
  }

  return (
    <div className="speedtest">
      <div className="speedtest-bar">
        <span className="mono">{Math.floor(watch.elapsed() / 1000)}s</span>
        <button className="btn primary" onClick={done}>Done reading</button>
      </div>
      <div className="reading" style={{ fontFamily: `var(--font-${settings.font})`, fontSize: `${settings.fontSize}px` }}>
        {text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <div className="center">
        <button className="btn primary lg" onClick={done}>Done reading</button>
      </div>
    </div>
  );
}
