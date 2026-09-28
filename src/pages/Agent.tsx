import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../state';
import { useCopy } from '../hooks';
import { SAMPLES } from '../data/samples';
import { analyze, tighten, type Analysis, type Severity } from '../lib/analyzer';
import { formatDuration } from '../lib/text';
import {
  PRESETS, RULES, STEERING, TARGETS, applyPreset, buildPrompt, defaultOptions,
  type BuildOptions, type Target,
} from '../lib/promptBuilder';
import { describeError, loadAiConfig, rewriteForFastReading, type AiConfig } from '../lib/ai';
import { Markdown } from '../components/Markdown';
import { AiSettings } from '../components/AiSettings';

type Tab = 'analyze' | 'prompt' | 'steer';

const PROMPT_KEY = 'readfaster.prompt.v1';

function loadPromptOptions(): BuildOptions {
  try {
    const raw = localStorage.getItem(PROMPT_KEY);
    if (raw) {
      const d = defaultOptions();
      const p = JSON.parse(raw) as BuildOptions;
      return { ...d, ...p, enabled: { ...d.enabled, ...p.enabled }, values: { ...d.values, ...p.values } };
    }
  } catch { /* fall through */ }
  return defaultOptions();
}

export function Agent({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<Tab>(initialTab === 'prompt' || initialTab === 'steer' ? initialTab : 'analyze');
  const [opts, setOpts] = useState<BuildOptions>(loadPromptOptions);

  useEffect(() => {
    try { localStorage.setItem(PROMPT_KEY, JSON.stringify(opts)); } catch { /* ignore */ }
  }, [opts]);

  const go = (t: Tab) => {
    setTab(t);
    window.history.replaceState(null, '', `#/agent/${t}`);
  };

  return (
    <div className="page">
      <h1>Agent output</h1>
      <p className="lede">
        The fastest text to read is text written for fast reading. Measure what your agents produce, then tell them how to write.
      </p>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'analyze'} className={tab === 'analyze' ? 'on' : ''} onClick={() => go('analyze')}>Analyze &amp; rewrite</button>
        <button role="tab" aria-selected={tab === 'prompt'} className={tab === 'prompt' ? 'on' : ''} onClick={() => go('prompt')}>Style prompt builder</button>
        <button role="tab" aria-selected={tab === 'steer'} className={tab === 'steer' ? 'on' : ''} onClick={() => go('steer')}>Follow-up commands</button>
      </div>
      {tab === 'analyze' && <Analyze promptOptions={opts} onOpenBuilder={() => go('prompt')} />}
      {tab === 'prompt' && <PromptBuilder opts={opts} setOpts={setOpts} />}
      {tab === 'steer' && <Steering />}
    </div>
  );
}

const SEV_ICON: Record<Severity, string> = { bad: '✕', warn: '!', info: 'i', good: '✓' };

function scoreClass(score: number) {
  return score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';
}

function Analyze({ promptOptions, onOpenBuilder }: { promptOptions: BuildOptions; onOpenBuilder: () => void }) {
  const { settings } = useApp();
  const [text, setText] = useState(() => {
    const handoff = sessionStorage.getItem('readfaster.analyze');
    sessionStorage.removeItem('readfaster.analyze');
    return handoff ?? '';
  });
  const [showMarks, setShowMarks] = useState(true);
  const [ai, setAi] = useState<AiConfig>(loadAiConfig);
  const [showAi, setShowAi] = useState(false);
  const [rewrite, setRewrite] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState('');
  const [copied, copy] = useCopy();
  const abort = useRef<AbortController | null>(null);

  const a = useMemo(() => analyze(text, settings.wpm), [text, settings.wpm]);
  const after = useMemo(() => (rewrite ? analyze(rewrite, settings.wpm) : null), [rewrite, settings.wpm]);
  const marks = useMemo(
    () => a.fillers.map((f) => ({ index: f.index, length: f.match.length, title: f.label })),
    [a.fillers],
  );

  const doTighten = () => setRewrite(tighten(text).text);

  const doAiRewrite = async () => {
    if (!ai.apiKey) { setShowAi(true); return; }
    setError('');
    setRewriting(true);
    setRewrite('');
    abort.current = new AbortController();
    try {
      const style = buildPrompt({ ...promptOptions, target: 'system', extra: promptOptions.extra });
      await rewriteForFastReading(ai, style, text, (snap) => setRewrite(snap), abort.current.signal);
    } catch (e) {
      if (!abort.current?.signal.aborted) setError(describeError(e));
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="row wrap">
          <span className="muted small">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button key={s.id} className="btn small" onClick={() => { setText(s.text); setRewrite(null); }}>{s.label}</button>
          ))}
        </div>
        <textarea
          className="paste"
          rows={10}
          value={text}
          onChange={(e) => { setText(e.target.value); setRewrite(null); }}
          placeholder="Paste a response from any AI agent or chat. Markdown is fine."
        />
      </div>

      {text.trim() && (
        <>
          <div className="analysis">
            <div className={`score-ring ${scoreClass(a.score)}`}>
              <span className="score-num">{a.score}</span>
              <span className="score-label">fast-read<br />score</span>
            </div>
            <Metrics a={a} wpm={settings.wpm} />
          </div>

          <ul className="findings">
            {a.findings.map((f) => (
              <li key={f.id} className={`finding ${f.severity}`}>
                <span className="sev" aria-label={f.severity}>{SEV_ICON[f.severity]}</span>
                <div><strong>{f.title}</strong><div className="small">{f.detail}</div></div>
              </li>
            ))}
          </ul>

          <div className="row wrap">
            <button className="btn" onClick={doTighten}>Tighten (instant, local)</button>
            <button className="btn primary" onClick={doAiRewrite} disabled={rewriting}>
              {rewriting ? 'Rewriting…' : 'Rewrite with Claude'}
            </button>
            {rewriting && <button className="btn ghost" onClick={() => abort.current?.abort()}>Stop</button>}
            <button className="btn ghost small" onClick={() => setShowAi((s) => !s)}>AI settings</button>
            <span className="grow" />
            <label className="row small">
              <input type="checkbox" checked={showMarks} onChange={(e) => setShowMarks(e.target.checked)} />
              Highlight filler
            </label>
          </div>
          {(showAi || (!ai.apiKey && rewriting)) && <AiSettings config={ai} onChange={(c) => { setAi(c); setShowAi(false); }} />}
          {error && <div className="callout bad">{error}</div>}
          <p className="muted small">
            Claude rewrites use the style in your <button className="link" onClick={onOpenBuilder}>style prompt builder</button>.
            Tighten only strips stock openers, sign-offs and wordy phrases.
          </p>

          <div className={rewrite != null ? 'split' : ''}>
            <div className="panel">
              <h3>Original</h3>
              <Markdown source={text} marks={showMarks ? marks : []} />
            </div>
            {rewrite != null && (
              <div className="panel">
                <div className="row">
                  <h3 className="grow">Rewritten</h3>
                  {after && <span className={`pill ${scoreClass(after.score)}`}>{after.score}</span>}
                  <button className="btn small" onClick={() => copy(rewrite)} disabled={!rewrite}>{copied ? 'Copied' : 'Copy'}</button>
                  <button className="btn small" onClick={() => { setText(rewrite); setRewrite(null); }} disabled={!rewrite || rewriting}>Use as input</button>
                </div>
                {after && !rewriting && (
                  <p className="small ok-text">
                    {a.words} → {after.words} words ({a.words ? Math.round(((a.words - after.words) / a.words) * 100) : 0}% shorter),
                    {' '}~{formatDuration(a.readingSeconds - after.readingSeconds)} saved at {settings.wpm} wpm.
                  </p>
                )}
                <Markdown source={rewrite || '…'} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metrics({ a, wpm }: { a: Analysis; wpm: number }) {
  const items: [string, string][] = [
    ['Words', String(a.words)],
    [`Read time @${wpm}`, formatDuration(a.readingSeconds)],
    ['Avg sentence', `${a.avgSentenceLength.toFixed(0)} words`],
    ['Reading ease', a.fleschEase.toFixed(0)],
    ['Filler phrases', String(a.fillers.length)],
    ['Headings / bullets', `${a.headings} / ${a.bullets}`],
  ];
  return (
    <dl className="metrics">
      {items.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

function PromptBuilder({ opts, setOpts }: { opts: BuildOptions; setOpts: (o: BuildOptions) => void }) {
  const [copied, copy] = useCopy();
  const prompt = buildPrompt(opts);
  const target = TARGETS.find((t) => t.id === opts.target)!;

  return (
    <div className="builder">
      <div>
        <h3>Start from a preset</h3>
        <div className="row wrap">
          {PRESETS.map((p) => (
            <button key={p.id} className="btn" title={p.description} onClick={() => setOpts(applyPreset(p, opts.target))}>{p.label}</button>
          ))}
        </div>
        <h3>Rules</h3>
        <ul className="rules">
          {RULES.map((r) => (
            <li key={r.id} className={opts.enabled[r.id] ? 'on' : ''}>
              <label className="rule-head">
                <input
                  type="checkbox"
                  checked={!!opts.enabled[r.id]}
                  onChange={(e) => setOpts({ ...opts, enabled: { ...opts.enabled, [r.id]: e.target.checked } })}
                />
                <strong>{r.label}</strong>
              </label>
              <div className="muted small">{r.why}</div>
              {r.value && opts.enabled[r.id] && (
                <label className="row small">
                  <input
                    type="number"
                    min={r.value.min}
                    max={r.value.max}
                    step={r.value.step}
                    value={opts.values[r.id] ?? r.value.default}
                    onChange={(e) => setOpts({ ...opts, values: { ...opts.values, [r.id]: Math.max(r.value!.min, Math.min(r.value!.max, +e.target.value || r.value!.default)) } })}
                  />
                  {r.value.unit}
                </label>
              )}
            </li>
          ))}
        </ul>
        <h3>Anything else</h3>
        <textarea
          className="paste"
          rows={3}
          value={opts.extra ?? ''}
          onChange={(e) => setOpts({ ...opts, extra: e.target.value })}
          placeholder="e.g. Use British spelling. Put file paths in backticks."
        />
      </div>
      <div className="builder-out">
        <div className="seg wrap" role="group" aria-label="Where you'll use it">
          {TARGETS.map((t) => (
            <button key={t.id} className={opts.target === t.id ? 'on' : ''} onClick={() => setOpts({ ...opts, target: t.id as Target })}>{t.label}</button>
          ))}
        </div>
        <p className="muted small">{target.hint}</p>
        <pre className="prompt-out">{prompt || 'Enable at least one rule.'}</pre>
        <button className="btn primary" onClick={() => copy(prompt)} disabled={!prompt}>{copied ? 'Copied!' : 'Copy prompt'}</button>
        <p className="muted small">
          Tip: after a week, paste a few typical responses into the analyzer. If scores are still low, tighten the word budget or turn on progressive disclosure.
        </p>
      </div>
    </div>
  );
}

function Steering() {
  const [copied, setCopied] = useState<number | null>(null);
  const [, copy] = useCopy();
  return (
    <div>
      <p className="muted">When a response arrives in the wrong shape, reshape it with one of these follow-ups instead of reading all of it.</p>
      <div className="cards">
        {STEERING.map((s, i) => (
          <div key={s.label} className="card steer">
            <h3>{s.label}</h3>
            <p className="muted small">{s.when}</p>
            <blockquote>{s.prompt}</blockquote>
            <button className="btn small" onClick={() => { copy(s.prompt); setCopied(i); window.setTimeout(() => setCopied(null), 1500); }}>
              {copied === i ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
