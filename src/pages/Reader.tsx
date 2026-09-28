import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { SAMPLES } from '../data/samples';
import { tighten } from '../lib/analyzer';
import { isRecordable } from '../lib/storage';
import { countWords, formatDuration, markdownToPlain, readingSeconds, tokenize } from '../lib/text';
import { Markdown } from '../components/Markdown';
import { Pacer } from '../components/Pacer';
import { RSVP, type ReadResult } from '../components/RSVP';
import { Quiz } from '../components/Quiz';
import { describeError, generateQuiz, loadAiConfig } from '../lib/ai';
import type { Question } from '../data/types';

type Mode = 'view' | 'pacer' | 'rsvp' | 'chunk';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'view', label: 'Formatted', hint: 'Rendered Markdown, optionally with bionic emphasis.' },
  { id: 'pacer', label: 'Pacer', hint: 'Guide sweeps through the text at your speed.' },
  { id: 'chunk', label: 'Chunks', hint: 'Phrases flash one at a time.' },
  { id: 'rsvp', label: 'Flash', hint: 'One word at a time, eyes still.' },
];

/**
 * Apply the trained techniques to real reading: paste agent output and read
 * it with a pacer, chunker or flash reader, then check what you retained.
 */
export function Reader() {
  const { settings, updateSettings, addSession } = useApp();
  const [source, setSource] = useState('');
  const [mode, setMode] = useState<Mode>('view');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [recall, setRecall] = useState('');
  const [reveal, setReveal] = useState(false);
  const [tightenNote, setTightenNote] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [quizState, setQuizState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [quizError, setQuizError] = useState('');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const ai = useMemo(loadAiConfig, [result]);

  const resetResult = () => {
    setResult(null);
    setRecall('');
    setReveal(false);
    setQuiz(null);
    setQuizState('idle');
    setQuizScore(null);
  };

  const makeQuiz = async () => {
    setQuizState('loading');
    setQuizError('');
    try {
      const qs = await generateQuiz(ai, plain);
      if (!qs.length) throw new Error('No usable questions came back. Try again.');
      setQuiz(qs);
      setQuizState('idle');
    } catch (e) {
      setQuizError(describeError(e));
      setQuizState('error');
    }
  };

  const plain = useMemo(() => markdownToPlain(source), [source]);
  const tokens = useMemo(() => tokenize(plain), [plain]);
  const words = countWords(plain);

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

  const sessionMode = mode === 'chunk' ? 'chunk' : mode === 'rsvp' ? 'rsvp' : 'pacer';

  const onFinish = (r: ReadResult) => {
    setResult(r);
    setRunning(false);
    // Sessions with an AI quiz are recorded once the quiz is scored.
    if (!loadAiConfig().apiKey && isRecordable(r)) {
      addSession({ mode: sessionMode, wpm: r.avgWpm, words: r.words, seconds: r.seconds, note: 'own text' });
    }
  };

  const recordWithoutQuiz = () => {
    if (result && ai.apiKey && quizScore == null && isRecordable(result)) {
      addSession({ mode: sessionMode, wpm: result.avgWpm, words: result.words, seconds: result.seconds, note: 'own text' });
    }
  };

  if (running && mode !== 'view') {
    return (
      <div className="page wide">
        <div className="page-head">
          <button className="btn ghost" onClick={() => setRunning(false)}>← Back to text</button>
          <h1>Reading</h1>
        </div>
        {mode === 'pacer' && <Pacer key={runKey} tokens={tokens} wpm={settings.wpm} chunkSize={settings.chunkSize} onFinish={onFinish} />}
        {mode === 'rsvp' && <RSVP key={runKey} tokens={tokens} wpm={settings.wpm} chunkSize={1} onFinish={onFinish} />}
        {mode === 'chunk' && <RSVP key={runKey} tokens={tokens} wpm={settings.wpm} chunkSize={Math.max(2, settings.chunkSize)} onFinish={onFinish} />}
      </div>
    );
  }

  if (result) {
    if (quiz && quizScore == null) {
      return (
        <div className="page">
          <Quiz
            questions={quiz}
            onDone={(score) => {
              setQuizScore(score);
              if (isRecordable(result)) addSession({ mode: sessionMode, wpm: result.avgWpm, comprehension: score, words: result.words, seconds: result.seconds, note: 'own text, AI quiz' });
            }}
          />
        </div>
      );
    }
    const done = () => { recordWithoutQuiz(); resetResult(); };
    return (
      <div className="page">
        <h1>Recall check</h1>
        <p className="lede">
          You read {result.words} words at <strong>{result.avgWpm} wpm</strong>.
          {quizScore != null
            ? <> Quiz: <strong>{Math.round(quizScore * 100)}%</strong>, effective speed <strong>{Math.round(result.avgWpm * quizScore)} wpm</strong>.</>
            : ' Before looking back, check what stuck.'}
        </p>
        {quizScore == null && ai.apiKey && result.completed && (
          <div className="panel">
            <h3>Quiz me</h3>
            <p className="muted small">Claude writes 5 questions about the key points of what you just read.</p>
            <button className="btn primary" onClick={makeQuiz} disabled={quizState === 'loading'}>
              {quizState === 'loading' ? 'Writing questions…' : 'Generate quiz'}
            </button>
            {quizState === 'error' && <div className="callout bad">{quizError}</div>}
          </div>
        )}
        {!ai.apiKey && (
          <p className="muted small">Tip: connect Claude on the <a href="#/agent">Agent output</a> page (Rewrite with Claude → AI settings) to get an auto-generated quiz here.</p>
        )}
        {quizScore == null && (
          <>
            <h3>{ai.apiKey ? 'Or write' : 'Write'} down the key points you remember</h3>
            <textarea className="paste" rows={6} value={recall} onChange={(e) => setRecall(e.target.value)} placeholder="Decision, numbers, action items, risks…" />
            <div className="row wrap">
              <button className="btn primary" onClick={() => setReveal(true)} disabled={!recall.trim()}>Compare with the text</button>
              <button className="btn" onClick={done}>Skip</button>
            </div>
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
      <p className="lede">Paste agent output, docs or chat responses and read them with your trained techniques.</p>

      <div className="panel">
        <div className="row wrap">
          <span className="muted small">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.id} className="btn small" onClick={() => { setSource(s.text); setTightenNote(''); }}>{s.label}</button>
          ))}
        </div>
        <textarea
          className="paste"
          rows={source ? 8 : 12}
          value={source}
          onChange={(e) => { setSource(e.target.value); setTightenNote(''); }}
          placeholder="Paste text here. Markdown is supported."
        />
        <div className="row wrap">
          <span className="muted">{words} words · ~{formatDuration(readingSeconds(words, settings.wpm))} at {settings.wpm} wpm</span>
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
              <label className="row">
                <input type="checkbox" checked={settings.bionic} onChange={(e) => updateSettings({ bionic: e.target.checked })} />
                Bionic emphasis
              </label>
            ) : (
              <>
                <label className="row small">
                  Speed
                  <input type="number" min={60} max={1500} step={10} value={settings.wpm} onChange={(e) => updateSettings({ wpm: Math.max(60, +e.target.value || 60) })} />
                  wpm
                </label>
                {mode !== 'rsvp' && (
                  <label className="row small">
                    Chunk
                    <select value={settings.chunkSize} onChange={(e) => updateSettings({ chunkSize: +e.target.value })}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} word{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </label>
                )}
                <button className="btn primary" onClick={() => { setRunKey((k) => k + 1); setRunning(true); }}>Read now</button>
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
