import { useMemo, useState } from 'react';
import { PASSAGES } from '../data/passages';
import type { Passage } from '../data/types';
import { useApp } from '../state';
import { countWords, tokenize } from '../lib/text';
import { MAX_PLAUSIBLE_WPM, MIN_SESSION_WORDS, isRecordable, recommendWpm, type SessionMode } from '../lib/storage';
import { RSVP, type ReadResult } from '../components/RSVP';
import { Pacer } from '../components/Pacer';
import { Quiz } from '../components/Quiz';
import { SpeedTest } from '../components/SpeedTest';
import { Schulte } from '../components/Schulte';
import { SpanDrill } from '../components/SpanDrill';

interface DrillDef {
  id: SessionMode;
  name: string;
  technique: string;
  blurb: string;
  reading: boolean;
}

export const DRILLS: DrillDef[] = [
  { id: 'test', name: 'Speed test', technique: 'Baseline', reading: true,
    blurb: 'Read normally, then answer 5 questions. Gives your real reading speed and effective (speed × comprehension) speed.' },
  { id: 'pacer', name: 'Visual pacer', technique: 'Pacing', reading: true,
    blurb: 'A guide sweeps under the text like a finger. Keeps your eyes moving forward and stops back-skipping.' },
  { id: 'chunk', name: 'Chunk reader', technique: 'Chunking', reading: true,
    blurb: 'Phrases of 2–5 words flash as single units. Trains you to take in meaning in groups, not word by word.' },
  { id: 'rsvp', name: 'Flash reader (RSVP)', technique: 'Subvocalization', reading: true,
    blurb: 'One word at a time in a fixed spot. Above ~350 wpm your inner voice can\'t keep up, so you learn to let it go.' },
  { id: 'ramp', name: 'Speed ramp', technique: 'Subvocalization', reading: true,
    blurb: 'Starts at your pace and speeds up every few sentences. Pushes you past speaking speed in small steps.' },
  { id: 'span', name: 'Flash span', technique: 'Chunking', reading: false,
    blurb: 'Words flash around a fixation point for a split second. Widens how much you take in per glance.' },
  { id: 'schulte', name: 'Schulte table', technique: 'Peripheral vision', reading: false,
    blurb: 'Find 1–25 in order without moving your eyes from the centre. Classic peripheral-vision exercise.' },
];

type Step = 'pick' | 'setup' | 'run' | 'quiz' | 'result';

export function Train({ initialDrill }: { initialDrill?: string }) {
  const { settings, updateSettings, history, addSession } = useApp();
  const [drillId, setDrillId] = useState<SessionMode | null>(
    DRILLS.some((d) => d.id === initialDrill) ? (initialDrill as SessionMode) : null,
  );
  const [step, setStep] = useState<Step>(drillId ? 'setup' : 'pick');
  const drill = DRILLS.find((d) => d.id === drillId) ?? null;

  const readIds = useMemo(() => new Set(history.map((h) => h.passageId).filter(Boolean)), [history]);
  const suggested = PASSAGES.find((p) => !readIds.has(p.id)) ?? PASSAGES[0];
  const [passageId, setPassageId] = useState<string>(suggested?.id ?? 'custom');
  const [custom, setCustom] = useState('');
  const passage: Passage | undefined = PASSAGES.find((p) => p.id === passageId);
  const text = passage ? passage.text : custom;
  const words = countWords(text);
  const tokens = useMemo(() => tokenize(text), [text]);

  const recommended = recommendWpm(history, settings.wpm);
  const [wpm, setWpm] = useState(settings.wpm);
  const [chunk, setChunk] = useState(Math.max(2, settings.chunkSize));
  const [result, setResult] = useState<ReadResult | null>(null);
  const [comprehension, setComprehension] = useState<number | null>(null);
  const [runKey, setRunKey] = useState(0);

  const pick = (id: SessionMode) => {
    setDrillId(id);
    setStep('setup');
    setResult(null);
    setComprehension(null);
    window.location.hash = `/train/${id}`;
  };

  const onFinish = (r: ReadResult) => {
    setResult(r);
    if (passage && r.completed) setStep('quiz');
    else finalize(r, null);
  };

  const finalize = (r: ReadResult, comp: number | null) => {
    setComprehension(comp);
    if (isRecordable(r)) addSession({
      mode: drill!.id,
      wpm: r.avgWpm,
      comprehension: comp ?? undefined,
      words: r.words,
      seconds: r.seconds,
      passageId: passage?.id,
      note: drill!.id === 'chunk' ? `${chunk}-word chunks` : drill!.id === 'ramp' ? `ended at ${r.finalWpm} wpm` : undefined,
    });
    setStep('result');
  };

  if (step === 'pick' || !drill) {
    return (
      <div className="page">
        <h1>Train</h1>
        <p className="lede">Each drill targets one technique. Start with a <strong>speed test</strong> to get your baseline, then rotate through the others.</p>
        <div className="cards">
          {DRILLS.map((d) => (
            <button key={d.id} className="card drill-card" onClick={() => pick(d.id)}>
              <span className="tag">{d.technique}</span>
              <h3>{d.name}</h3>
              <p>{d.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const header = (
    <div className="page-head">
      <button className="btn ghost" onClick={() => { setStep('pick'); setDrillId(null); window.location.hash = '/train'; }}>← All drills</button>
      <div>
        <span className="tag">{drill.technique}</span>
        <h1>{drill.name}</h1>
      </div>
    </div>
  );

  if (!drill.reading) {
    return (
      <div className="page">
        {header}
        <p className="lede">{drill.blurb}</p>
        {drill.id === 'schulte' ? <Schulte /> : <SpanDrill />}
      </div>
    );
  }

  if (step === 'setup') {
    const needsWpm = drill.id !== 'test';
    return (
      <div className="page">
        {header}
        <p className="lede">{drill.blurb}</p>
        <div className="panel">
          <h3>Text</h3>
          <div className="passage-list">
            {PASSAGES.map((p) => (
              <label key={p.id} className={`passage-item${passageId === p.id ? ' on' : ''}`}>
                <input type="radio" name="passage" checked={passageId === p.id} onChange={() => setPassageId(p.id)} />
                <span className="grow">
                  <strong>{p.title}</strong>
                  <span className="muted small"> · {p.topic} · {countWords(p.text)} words</span>
                </span>
                <span className={`level ${p.level}`}>{p.level}</span>
                {readIds.has(p.id) && <span className="muted small">read</span>}
              </label>
            ))}
            <label className={`passage-item${passageId === 'custom' ? ' on' : ''}`}>
              <input type="radio" name="passage" checked={passageId === 'custom'} onChange={() => setPassageId('custom')} />
              <span className="grow"><strong>My own text</strong><span className="muted small"> · no quiz</span></span>
            </label>
          </div>
          {passageId === 'custom' && (
            <textarea
              className="paste"
              rows={8}
              placeholder="Paste any text, e.g. a long agent response or a document you need to get through."
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          )}
        </div>

        {needsWpm && (
          <div className="panel">
            <h3>Speed</h3>
            <div className="row wrap">
              <input
                type="range"
                min={100}
                max={1000}
                step={10}
                value={wpm}
                onChange={(e) => setWpm(+e.target.value)}
                aria-label="Words per minute"
              />
              <strong className="mono">{wpm} wpm</strong>
              {recommended !== wpm && (
                <button className="btn small" onClick={() => setWpm(recommended)}>Use recommended: {recommended}</button>
              )}
            </div>
            <p className="muted small">
              Train about 10–20% above your comfortable speed. Recommended speed rises when your quiz scores stay at 70% or higher and falls when they drop.
            </p>
            {drill.id === 'chunk' && (
              <div className="row">
                <span>Words per chunk</span>
                <div className="seg">
                  {[2, 3, 4, 5].map((n) => (
                    <button key={n} className={chunk === n ? 'on' : ''} onClick={() => setChunk(n)}>{n}</button>
                  ))}
                </div>
              </div>
            )}
            <label className="row">
              <input type="checkbox" checked={settings.beat} onChange={(e) => updateSettings({ beat: e.target.checked })} />
              <span>Inner-voice blocker: a soft beat to hum or tap along to ({settings.beatBpm} bpm)</span>
            </label>
          </div>
        )}

        <button
          className="btn primary lg"
          disabled={words < 20}
          onClick={() => {
            if (needsWpm) updateSettings({ wpm });
            setRunKey((k) => k + 1);
            setStep('run');
          }}
        >
          Begin{words ? ` · ${words} words` : ''}
        </button>
        {words > 0 && words < 20 && <p className="muted small">Paste at least 20 words.</p>}
      </div>
    );
  }

  if (step === 'run') {
    return (
      <div className="page wide">
        {header}
        {passage && <h2 className="passage-title">{passage.title}</h2>}
        {drill.id === 'test' && <SpeedTest key={runKey} text={text} words={words} onFinish={onFinish} />}
        {drill.id === 'pacer' && <Pacer key={runKey} tokens={tokens} wpm={wpm} chunkSize={1} onFinish={onFinish} />}
        {drill.id === 'rsvp' && <RSVP key={runKey} tokens={tokens} wpm={wpm} chunkSize={1} onFinish={onFinish} />}
        {drill.id === 'chunk' && <RSVP key={runKey} tokens={tokens} wpm={wpm} chunkSize={chunk} onFinish={onFinish} />}
        {drill.id === 'ramp' && (
          <RSVP key={runKey} tokens={tokens} wpm={wpm} chunkSize={1} ramp={{ step: 25, every: 40, max: Math.max(wpm + 300, 600) }} onFinish={onFinish} />
        )}
      </div>
    );
  }

  if (step === 'quiz' && passage && result) {
    return (
      <div className="page">
        {header}
        <Quiz questions={passage.questions} onDone={(score) => finalize(result, score)} />
      </div>
    );
  }

  // Result
  const r = result!;
  const eff = comprehension != null ? Math.round(r.avgWpm * comprehension) : null;
  const nextWpm = recommendWpm(history, drill.id === 'test' ? r.avgWpm : wpm);
  return (
    <div className="page">
      {header}
      <div className="stats">
        <div className="stat"><span className="stat-label">Reading speed</span><span className="stat-value">{r.avgWpm}</span><span className="stat-unit">wpm</span></div>
        {comprehension != null && (
          <div className="stat"><span className="stat-label">Comprehension</span><span className="stat-value">{Math.round(comprehension * 100)}%</span></div>
        )}
        {eff != null && (
          <div className="stat accent"><span className="stat-label">Effective speed</span><span className="stat-value">{eff}</span><span className="stat-unit">wpm</span></div>
        )}
        <div className="stat"><span className="stat-label">Words</span><span className="stat-value">{r.words}</span></div>
      </div>
      <div className="callout">
        {feedback(r.avgWpm, comprehension, drill.id)}
      </div>
      {r.avgWpm > 900 && (
        <div className="callout bad">
          {r.avgWpm} wpm is faster than reading research considers possible with full comprehension. If you skimmed, this result isn't a reliable baseline; try again reading every sentence.
        </div>
      )}
      {!isRecordable(r) && (
        <p className="muted small">
          Not saved to your progress: {r.words < MIN_SESSION_WORDS ? `fewer than ${MIN_SESSION_WORDS} words read` : `over ${MAX_PLAUSIBLE_WPM} wpm isn't plausible reading`}.
        </p>
      )}
      {!r.completed && <p className="muted small">You finished early, so this session has no quiz. Speed is based on the words you got through.</p>}
      <div className="row wrap">
        <button className="btn primary" onClick={() => { setWpm(nextWpm); updateSettings({ wpm: nextWpm }); setPassageId(suggested.id); setStep('setup'); }}>
          Next session at {nextWpm} wpm
        </button>
        <button className="btn" onClick={() => { setPassageId(suggested.id); setStep('setup'); }}>Same speed, new text</button>
        <a className="btn ghost" href="#/progress">View progress</a>
      </div>
    </div>
  );
}

function feedback(wpm: number, comp: number | null, mode: SessionMode): string {
  if (comp == null) {
    return mode === 'test'
      ? `You read at ${wpm} wpm.`
      : `You kept pace at ${wpm} wpm. Try a passage with a quiz to check what you retained.`;
  }
  if (comp < 0.5) return 'Comprehension dropped below half. Slow down 10–15% and focus on catching the main idea of each paragraph. Speed without retention is just skimming.';
  if (comp < 0.7) return 'Decent, but some key points slipped. Hold this speed until you reliably score 4/5 before pushing faster.';
  if (wpm < 200) return 'Strong comprehension. You have room to go faster: try the pacer 10–20% above this speed.';
  if (wpm < 350) return 'Solid: typical adult speed with good retention. Use chunking and the speed ramp to push past speaking pace.';
  return 'Fast and accurate. Keep mixing in quizzes so speed doesn\'t outrun understanding.';
}
