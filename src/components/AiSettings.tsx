import { useState } from 'react';
import { AI_MODELS, clearAiConfig, saveAiConfig, type AiConfig } from '../lib/ai';

interface Props {
  config: AiConfig;
  onChange: (c: AiConfig) => void;
}

/** Optional API-key panel for the Claude-powered features. */
export function AiSettings({ config, onChange }: Props) {
  const [draft, setDraft] = useState(config);
  const [open, setOpen] = useState(!config.apiKey);

  const save = () => {
    saveAiConfig(draft);
    onChange(draft);
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="ai-status">
        <span className="dot on" /> Claude connected ({AI_MODELS.find((m) => m.id === config.model)?.label ?? config.model})
        <button className="btn small ghost" onClick={() => setOpen(true)}>Change</button>
      </div>
    );
  }

  return (
    <div className="panel ai-settings">
      <h3>Connect Claude (optional)</h3>
      <p className="muted small">
        AI rewrite and quiz generation call the Claude API directly from your browser using your own key from
        {' '}<a href="https://platform.claude.com/settings/keys" target="_blank" rel="noreferrer noopener">platform.claude.com</a>.
        The key is sent only to Anthropic. By default it is kept for this tab only.
      </p>
      <div className="form-grid">
        <label>
          API key
          <input
            type="password"
            autoComplete="off"
            value={draft.apiKey}
            placeholder="sk-ant-…"
            onChange={(e) => setDraft({ ...draft, apiKey: e.target.value.trim() })}
          />
        </label>
        <label>
          Model
          <select value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
            {AI_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <label className="row small">
        <input type="checkbox" checked={draft.remember} onChange={(e) => setDraft({ ...draft, remember: e.target.checked })} />
        Remember the key on this device (stored in this browser's local storage)
      </label>
      <div className="row">
        <button className="btn primary" disabled={!draft.apiKey} onClick={save}>Save</button>
        {config.apiKey && (
          <button className="btn" onClick={() => { clearAiConfig(); const c = { ...draft, apiKey: '' }; setDraft(c); onChange(c); }}>
            Forget key
          </button>
        )}
        {config.apiKey && <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>}
      </div>
    </div>
  );
}
