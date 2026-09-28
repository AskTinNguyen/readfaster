import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { effectiveWpm, summarize, type SessionRecord } from '../lib/storage';
import { formatDuration } from '../lib/text';
import { PASSAGES } from '../data/passages';
import { DRILLS } from '../lib/drills';

const modeName = (m: string) => DRILLS.find((d) => d.id === m)?.name ?? m;

export function Progress() {
  const { history, clearHistory } = useApp();
  const s = summarize(history);
  const [confirm, setConfirm] = useState(false);
  const reading = useMemo(() => history.filter((r) => r.wpm != null && r.mode !== 'span' && r.mode !== 'schulte'), [history]);

  if (!history.length) {
    return (
      <div className="page">
        <h1>Progress</h1>
        <p className="lede">No sessions yet. Start with the speed test to set your baseline.</p>
        <a className="btn primary" href="#/train/test">Take the speed test</a>
      </div>
    );
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `readfaster-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page">
      <h1>Progress</h1>
      <div className="stats">
        <div className="stat"><span className="stat-label">Baseline</span><span className="stat-value">{s.baselineWpm ?? '—'}</span><span className="stat-unit">wpm</span></div>
        <div className="stat"><span className="stat-label">Latest test</span><span className="stat-value">{s.latestWpm ?? '—'}</span><span className="stat-unit">wpm</span></div>
        <div className="stat accent"><span className="stat-label">Best effective</span><span className="stat-value">{s.bestEffectiveWpm ?? '—'}</span><span className="stat-unit">wpm</span></div>
        <div className="stat"><span className="stat-label">Avg comprehension</span><span className="stat-value">{s.avgComprehension != null ? `${Math.round(s.avgComprehension * 100)}%` : '—'}</span></div>
        <div className="stat"><span className="stat-label">Time trained</span><span className="stat-value">{s.minutesTrained}</span><span className="stat-unit">min</span></div>
        <div className="stat"><span className="stat-label">Streak</span><span className="stat-value">{s.streakDays}</span><span className="stat-unit">days</span></div>
      </div>

      {reading.length >= 2 ? (
        <div className="panel">
          <h3>Speed over time</h3>
          <Chart sessions={reading} />
        </div>
      ) : (
        <p className="muted">Complete a couple more reading sessions to see your trend.</p>
      )}

      <div className="panel">
        <h3>Sessions</h3>
        <div className="table-wrap">
          <table className="history">
            <thead>
              <tr><th>Date</th><th>Drill</th><th>Speed</th><th>Comp.</th><th>Effective</th><th>Time</th><th>Details</th></tr>
            </thead>
            <tbody>
              {[...history].reverse().map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                  <td>{modeName(r.mode)}</td>
                  <td className="num">{r.wpm != null ? `${r.wpm}` : r.mode === 'schulte' ? `${r.score}s` : r.mode === 'span' ? `span ${r.score}` : '—'}</td>
                  <td className="num">{r.comprehension != null ? `${Math.round(r.comprehension * 100)}%` : '—'}</td>
                  <td className="num">{effectiveWpm(r) ?? '—'}</td>
                  <td className="num">{r.seconds ? formatDuration(r.seconds) : '—'}</td>
                  <td className="muted small">{detail(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row wrap">
        <button className="btn" onClick={exportData}>Export JSON</button>
        {confirm ? (
          <>
            <span>Delete all {history.length} sessions?</span>
            <button className="btn danger" onClick={() => { clearHistory(); setConfirm(false); }}>Yes, delete</button>
            <button className="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button className="btn ghost" onClick={() => setConfirm(true)}>Reset history</button>
        )}
      </div>
    </div>
  );
}

function detail(r: SessionRecord): string {
  const p = r.passageId ? PASSAGES.find((x) => x.id === r.passageId)?.title : undefined;
  return [p, r.note].filter(Boolean).join(' · ');
}

/** Line chart of reading speed and effective speed per session. */
function Chart({ sessions }: { sessions: SessionRecord[] }) {
  const W = 640, H = 220, L = 44, R = 12, T = 12, B = 28;
  const pts = sessions.slice(-40);
  const max = Math.max(...pts.map((p) => p.wpm ?? 0)) * 1.1 || 100;
  const x = (i: number) => L + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = (vals: (number | undefined)[]) =>
    vals
      .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .join(' ');
  const speed = pts.map((p) => p.wpm);
  const eff = pts.map((p) => effectiveWpm(p));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((max * f) / 10) * 10);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Reading speed per session">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
            <text x={L - 6} y={y(t) + 4} className="axis" textAnchor="end">{t}</text>
          </g>
        ))}
        <text x={L} y={H - 6} className="axis">oldest</text>
        <text x={W - R} y={H - 6} className="axis" textAnchor="end">latest</text>
        <polyline points={line(speed)} className="series speed" />
        <polyline points={line(eff)} className="series eff" />
        {pts.map((p, i) => (
          <g key={p.id}>
            {p.wpm != null && <circle cx={x(i)} cy={y(p.wpm)} r={3.5} className="dot speed"><title>{`${modeName(p.mode)}: ${p.wpm} wpm`}</title></circle>}
            {eff[i] != null && <circle cx={x(i)} cy={y(eff[i]!)} r={3.5} className="dot eff"><title>{`Effective: ${eff[i]} wpm`}</title></circle>}
          </g>
        ))}
      </svg>
      <figcaption className="legend">
        <span><i className="sw speed" /> Reading speed (wpm)</span>
        <span><i className="sw eff" /> Effective speed (speed × comprehension)</span>
      </figcaption>
    </figure>
  );
}
