import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state';
import { SAMPLES } from '../data/samples';
import type { Question } from '../data/types';
import { tighten } from '../lib/analyzer';
import { isRecordable } from '../lib/storage';
import { useReaderInbox } from '../lib/inbox';
import type { ReaderMode } from '../lib/handoff';
import { countWords, formatDuration, markdownToPlain, readingSeconds, tokenize } from '../lib/text';
import { Markdown } from '../components/Markdown';
import { Pacer } from '../components/Pacer';
import { RSVP, type ReadResult } from '../components/RSVP';
import { Quiz } from '../components/Quiz';

const MODES: { id: ReaderMode; label: string; hint: string }[] = [
  { id: 'view', label: 'Formatted', hint: 'Rendered Markdown, optionally with bionic emphasis.' },
  { id: 'pacer', label: 'Pacer', hint: 'Guide sweeps through the text at your speed.' },
  { id: 'chunk', label: 'Chunks', hint: 'Phrases flash one at a time.' },
  { id: 'rsvp', label: 'Flash', hint: 'One word at a time, eyes still.' },
];

/**
 * Apply the trained techniques to real reading: paste agent output (or have
 * your agent send it here) and read it with a pacer, chunker or flash
 * reader, then check what you retained.
 */
export function Reader() {
  const { settings, updateSettings, addSession } = useApp();
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [mode, setMode] = useState<ReaderMode>('view');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [recall, setRecall] = useState('');
  const [reveal, setReveal] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [tightenNote, setTightenNote] = useState('');
  const [runKey, setRunKey] = useState(0);
  const recorded = useRef(false);
  // Speed/chunk requested by the agent for this text only; the user's saved settings stay as they are.
  const [override, setOverride] = useState<{ wpm?: number; chunkSize?: number }>({});
  const wpm = override.wpm ?? settings.wpm;
  const chunkSize = override.chunkSize ?? settings.chunkSize;

  // Text sent by the user's agent (MCP bridge or deep link).
  const delivery = useReaderInbox();
  const lastSeq = useRef(0);
  useEffect(() => {
    if (!delivery || delivery.seq === lastSeq.current) return;
    lastSeq.current = delivery.seq;
    const p = delivery.payload;
    setOverride({ wpm: p.wpm, chunkSize: p.chunkSize });
    setSource(p.text);
    setTitle(p.title ?? '');
    setQuestions(p.questions ?? null);
    setMode(p.mode ?? 'view');
    resetResult();
    setTightenNote('');
    setRunKey((k) => k + 1);
    setRunning(!!p.mode && p.mode !== 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  const plain = useMemo(() => markdownToPlain(source), [source]);
  const tokens = useMemo(() => tokenize(plain), [plain]);
  const words = countWords(plain);
  const sessionMode = mode === 'chunk' ? 'chunk' : mode === 'rsvp' ? 'rsvp' : 'pacer';
  const note = title ? `agent text: ${title}` : 'own text';

  function resetResult() {
    setResult(null);
    setRecall('');
    setReveal(false);
    setQuizScore(null);
    setQuizOpen(false);
    recorded.current = false;
  }

  const record = (r: ReadResult, comprehension?: number) => {
    if (recorded.current || !isRecordable(r)) return;
    recorded.current = true;
    addSession({ mode: sessionMode, wpm: r.avgWpm, comprehension, words: r.words, seconds: r.seconds, note });
  };

  const doTighten = () => {
    const r = tighten(source);
    setSource(r.text);
    const saved = r.wordsBefore - r.wordsAfter;
    setTightenNote(
      saved > 0
        ? `Removed ${r.removedSentences} filler sentence${r.removedSentences === 1 ? '' : 's'} and ${r.replacedPhrases} wordy phrase${r.replacedPhrases === 1 ? '' : 's'}: ${saved} fewer words (${Math.round((saved / r.wordsBefore) * 100)}%).`
        : 'Nothing to tighten.',
    );
  };

  const onFinish = (r: ReadResult) => {
    setResult(r);
    setRunning(false);
    // With agent-written questions, the session is saved once the quiz is scored.
    if (!(questions && r.completed)) record(r);
  };

  const done = () => {
    if (result) record(result);
    resetResult();
  };

  if (running && mode !== 'view') {
    return (
      <div className="page wide">
        <div className="page-head">
          <button className="btn ghost" onClick={() => setRunning(false)}>← Back to text</button>
          <h1>{title || 'Reading'}</h1>
        </div>
        {questions && <p className="muted small">Your agent attached {questions.length} questions. They follow when you finish.</p>}
        {mode === 'pacer' && <Pacer key={runKey} tokens={tokens} wpm={wpm} chunkSize={chunkSize} onFinish={onFinish} />}
        {mode === 'rsvp' && <RSVP key={runKey} tokens={tokens} wpm={wpm} chunkSize={1} onFinish={onFinish} />}
        {mode === 'chunk' && <RSVP key={runKey} tokens={tokens} wpm={wpm} chunkSize={Math.max(2, chunkSize)} onFinish={onFinish} />}
      </div>
    );
  }

  // Quiz from agent-written questions: after a paced read, or on request in formatted view.
  if (questions && quizScore == null && ((result && result.completed) || quizOpen)) {
    return (
      <div className="page">
        <p className="muted small">Questions written by your agent{title ? ` for "${title}"` : ''}.</p>
        <Quiz
          questions={questions}
          onDone={(score) => {
            setQuizScore(score);
            if (result) record(result, score);
          }}
        />
      </div>
    );
  }

  if (result || (quizOpen && quizScore != null)) {
    return (
      <div className="page">
        <h1>Recall check</h1>
        <p className="lede">
          {result && <>You read {result.words} words at <strong>{result.avgWpm} wpm</strong>.</>}
          {quizScore != null
            ? <> Quiz: <strong>{Math.round(quizScore * 100)}%</strong>{result && <>, effective speed <strong>{Math.round(result.avgWpm * quizScore)} wpm</strong></>}.</>
            : ' Before looking back, write down what stuck.'}
        </p>
        {quizScore == null && (
          <>
            <textarea className="paste" rows={6} value={recall} onChange={(e) => setRecall(e.target.value)} placeholder="Decision, numbers, action items, risks…" />
            <div className="row wrap">
              <button className="btn primary" onClick={() => setReveal(true)} disabled={!recall.trim()}>Compare with the text</button>
              <button className="btn" onClick={done}>Skip</button>
            </div>
            <p className="muted small">
              Want a scored quiz on text like this? Ask your agent to send it with questions, e.g. "send this to my ReadFaster reader with 5 comprehension questions". See <a href="#/agents">Agents</a>.
            </p>
          </>
        )}
        {reveal && (
          <div className="split">
            <div className="panel"><h3>You remembered</h3><p className="prewrap">{recall}</p></div>
            <div className="panel"><h3>Original</h3><Markdown source={source} /></div>
          </div>
        )}
        {reveal && (
          <p className="muted small">
            Missed a decision, number or action item? Those matter most in agent output. Next time slow down slightly, or read the formatted view's headings and bold text first.
          </p>
        )}
        {(reveal || quizScore != null) && <button className="btn primary" onClick={done}>Done</button>}
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Reader</h1>
      <p className="lede">
        Paste agent output, docs or chat responses and read them with your trained techniques. Or have your agent
        {' '}<a href="#/agents">send text here directly</a>.
      </p>

      <div className="panel">
        <div className="row wrap">
          <span className="muted small">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.id} className="btn small" onClick={() => { setSource(s.text); setTitle(''); setQuestions(null); setOverride({}); setTightenNote(''); }}>{s.label}</button>
          ))}
        </div>
        {title && (
          <div className="row agent-banner">
            <span className="tag">From your agent</span>
            <strong className="grow">{title}</strong>
            {questions && <span className="muted small">{questions.length} questions attached</span>}
          </div>
        )}
        <textarea
          className="paste"
          rows={source ? 8 : 12}
          value={source}
          onChange={(e) => { setSource(e.target.value); setTightenNote(''); }}
          placeholder="Paste text here. Markdown is supported."
        />
        <div className="row wrap">
          <span className="muted">{words} words · ~{formatDuration(readingSeconds(words, wpm))} at {wpm} wpm</span>
          <span className="grow" />
          <button className="btn" onClick={doTighten} disabled={!source.trim()} title="Strip stock openers, sign-offs and wordy phrases">Tighten</button>
          <a className="btn ghost" href="#/agent" onClick={() => sessionStorage.setItem('readfaster.analyze', source)}>Analyze →</a>
        </div>
        {tightenNote && <p className="small ok-text">{tightenNote}</p>}
      </div>

      {source.trim() && (
        <>
          <div className="row wrap mode-row">
            <div className="seg" role="tablist">
              {MODES.map((m) => (
                <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)} title={m.hint}>{m.label}</button>
              ))}
            </div>
            {mode === 'view' ? (
              <>
                <label className="row">
                  <input type="checkbox" checked={settings.bionic} onChange={(e) => updateSettings({ bionic: e.target.checked })} />
                  Bionic emphasis
                </label>
                {questions && <button className="btn primary" onClick={() => setQuizOpen(true)}>Quiz me ({questions.length})</button>}
              </>
            ) : (
              <>
                <label className="row small">
                  Speed
                  <input type="number" min={60} max={1500} step={10} value={wpm} onChange={(e) => { setOverride((o) => ({ ...o, wpm: undefined })); updateSettings({ wpm: Math.max(60, +e.target.value || 60) }); }} />
                  wpm
                </label>
                {mode !== 'rsvp' && (
                  <label className="row small">
                    Chunk
                    <select value={chunkSize} onChange={(e) => { setOverride((o) => ({ ...o, chunkSize: undefined })); updateSettings({ chunkSize: +e.target.value }); }}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} word{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </label>
                )}
                <button className="btn primary" onClick={() => { resetResult(); setRunKey((k) => k + 1); setRunning(true); }}>Read now</button>
              </>
            )}
          </div>
          {mode === 'view' && (
            <div className="panel reading" style={{ fontFamily: `var(--font-${settings.font})`, fontSize: `${settings.fontSize}px` }}>
              <Markdown source={source} bionic={settings.bionic} />
            </div>
          )}
          {mode !== 'view' && (
            <p className="muted small">
              Code blocks are replaced by "[code block]" in paced modes. Headings and list items become separate paragraphs.
            </p>
          )}
        </>
      )}
    </div>
  );
}
