import { formatDuration } from '../lib/text';

interface Props {
  playing: boolean;
  onToggle: () => void;
  onRestart: () => void;
  onFinish: () => void;
  wpm: number;
  onWpm: (wpm: number) => void;
  progress: number; // 0..1
  remainingSeconds: number;
  onSeek?: (fraction: number) => void;
  extra?: React.ReactNode;
}

export function PlayerBar(p: Props) {
  return (
    <div className="player">
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p.progress * 100)}
        onClick={(e) => {
          if (!p.onSeek) return;
          const r = e.currentTarget.getBoundingClientRect();
          p.onSeek((e.clientX - r.left) / r.width);
        }}
      >
        <div className="progress-fill" style={{ width: `${p.progress * 100}%` }} />
      </div>
      <div className="player-row">
        <button className="btn primary" onClick={p.onToggle} title="Space">
          {p.playing ? 'Pause' : p.progress > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="btn" onClick={p.onRestart} title="R">Restart</button>
        <div className="wpm-control" title="Up / Down arrows">
          <button className="btn icon" aria-label="Slower" onClick={() => p.onWpm(Math.max(60, p.wpm - 25))}>−</button>
          <span className="wpm-value"><strong>{p.wpm}</strong> wpm</span>
          <button className="btn icon" aria-label="Faster" onClick={() => p.onWpm(Math.min(1500, p.wpm + 25))}>+</button>
        </div>
        {p.extra}
        <span className="muted small grow right">{formatDuration(p.remainingSeconds)} left</span>
        <button className="btn ghost" onClick={p.onFinish} title="Esc">Finish</button>
      </div>
      <div className="kbd-hint">
        <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> skip · <kbd>↑</kbd>/<kbd>↓</kbd> speed · <kbd>Esc</kbd> finish
      </div>
    </div>
  );
}
