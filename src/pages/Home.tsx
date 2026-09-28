import { useApp } from '../state';
import { summarize } from '../lib/storage';

export function Home() {
  const { history } = useApp();
  const s = summarize(history);
  const fresh = history.length === 0;

  return (
    <div className="page">
      <section className="hero">
        <h1>Read AI output faster, <span className="accent-text">without missing what matters</span>.</h1>
        <p className="lede">
          Agents now write more than anyone can read. ReadFaster works both sides of the problem: it
          trains <strong>you</strong> to read faster, and helps you get <strong>agents</strong> to write text that is quicker to read.
        </p>
        <div className="row wrap">
          <a className="btn primary lg" href={fresh ? '#/train/test' : '#/train'}>{fresh ? 'Take the 2-minute speed test' : 'Continue training'}</a>
          <a className="btn lg" href="#/agent">Analyze agent output</a>
        </div>
      </section>

      {!fresh && (
        <div className="stats">
          <div className="stat"><span className="stat-label">Baseline</span><span className="stat-value">{s.baselineWpm ?? '—'}</span><span className="stat-unit">wpm</span></div>
          <div className="stat"><span className="stat-label">Latest test</span><span className="stat-value">{s.latestWpm ?? '—'}</span><span className="stat-unit">wpm</span></div>
          <div className="stat accent"><span className="stat-label">Best effective</span><span className="stat-value">{s.bestEffectiveWpm ?? '—'}</span><span className="stat-unit">wpm</span></div>
          <div className="stat"><span className="stat-label">Streak</span><span className="stat-value">{s.streakDays}</span><span className="stat-unit">day{s.streakDays === 1 ? '' : 's'}</span></div>
        </div>
      )}

      <h2>Two sides of the same problem</h2>
      <div className="cards two">
        <div className="card">
          <span className="tag">For you</span>
          <h3>Train your reading</h3>
          <ul className="checklist">
            <li><strong>Pacing</strong>: a guide sweeps under the text so your eyes keep moving forward.</li>
            <li><strong>Less subvocalization</strong>: flash and ramp drills push you past speaking speed.</li>
            <li><strong>Chunking</strong>: take in 2–5 word phrases per glance, plus eye-span drills.</li>
            <li><strong>Comprehension checks</strong> keep speed honest: you're scored on speed × understanding.</li>
          </ul>
          <a className="btn" href="#/train">Open drills →</a>
        </div>
        <div className="card">
          <span className="tag">For your agents</span>
          <h3>Shape what they write</h3>
          <ul className="checklist">
            <li><strong>Analyze</strong> any response: score, filler, wall-of-text, buried answers.</li>
            <li><strong>Tighten or rewrite</strong> it instantly, locally or with Claude.</li>
            <li><strong>Build a style prompt</strong> for system prompts, CLAUDE.md or chat settings.</li>
            <li><strong>Follow-up commands</strong> to reshape a bloated answer in one message.</li>
          </ul>
          <a className="btn" href="#/agent">Open agent tools →</a>
        </div>
      </div>

      <h2>A 10-minute daily routine</h2>
      <ol className="routine">
        <li><strong>2 min</strong>: Schulte table or flash span to warm up your peripheral vision.</li>
        <li><strong>4 min</strong>: Pacer or chunk reader on a new passage, 10–20% above your comfortable speed, then take the quiz.</li>
        <li><strong>2 min</strong>: Speed ramp to practise reading past your inner voice.</li>
        <li><strong>2 min</strong>: Read one real agent response in the <a href="#/read">Reader</a> using the same technique.</li>
      </ol>
    </div>
  );
}
