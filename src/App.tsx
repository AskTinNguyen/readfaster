import { useState } from 'react';
import { useRoute } from './hooks';
import { useApp } from './state';
import { Home } from './pages/Home';
import { Train } from './pages/Train';
import { Reader } from './pages/Reader';
import { Agent } from './pages/Agent';
import { Progress } from './pages/Progress';
import { Learn } from './pages/Learn';
import { Agents } from './pages/Agents';
import { AgentBridge } from './components/AgentBridge';
import { useBridge } from './lib/bridgeClient';
import type { Settings } from './lib/storage';

const NAV = [
  { id: 'train', label: 'Train' },
  { id: 'read', label: 'Reader' },
  { id: 'agent', label: 'Agent output' },
  { id: 'progress', label: 'Progress' },
  { id: 'agents', label: 'Agents' },
  { id: 'learn', label: 'How it works' },
];

export function App() {
  const [route] = useRoute();
  const [path, query = ''] = route.split('?');
  const [section, sub] = path.split('/');
  const params = new URLSearchParams(query);
  const [showSettings, setShowSettings] = useState(false);
  const bridge = useBridge();

  let page;
  switch (section) {
    case 'train': page = <Train key={`${sub ?? 'hub'}?${params.get('passage') ?? ''}${params.get('go') ?? ''}${params.get('wpm') ?? ''}`} initialDrill={sub} params={params} />; break;
    case 'read': page = <Reader />; break;
    case 'agent': page = <Agent initialTab={sub} />; break;
    case 'progress': page = <Progress />; break;
    case 'learn': page = <Learn />; break;
    case 'agents': page = <Agents />; break;
    default: page = <Home />;
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
            <rect width="32" height="32" rx="7" className="brand-bg" />
            <path d="M7 11h18M7 16h13M7 21h8" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          ReadFaster
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`} className={section === n.id ? 'on' : ''}>{n.label}</a>
          ))}
        </nav>
        {bridge.status !== 'off' && (
          <a href="#/agents" className={`agent-pill ${bridge.status}`} title={`Agent bridge: ${bridge.status}`}>
            <span className="dot" /> {bridge.status === 'connected' ? 'Agent' : bridge.status === 'error' ? 'Agent offline' : 'Agent…'}
          </a>
        )}
        <button className="btn ghost icon-btn" onClick={() => setShowSettings((s) => !s)} aria-label="Display settings" title="Display settings">
          Aa
        </button>
      </header>
      <AgentBridge />
      {showSettings && <DisplaySettings onClose={() => setShowSettings(false)} />}
      <main>{page}</main>
      <footer className="footer muted small">
        Your progress stays in this browser. No account, no tracking.
      </footer>
    </>
  );
}

function DisplaySettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);
  return (
    <div className="settings-pop" role="dialog" aria-label="Display settings">
      <div className="row">
        <strong className="grow">Display</strong>
        <button className="btn ghost small" onClick={onClose}>Close</button>
      </div>
      <label>Theme
        <select value={settings.theme} onChange={(e) => set('theme', e.target.value as Settings['theme'])}>
          <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
        </select>
      </label>
      <label>Reading font
        <select value={settings.font} onChange={(e) => set('font', e.target.value as Settings['font'])}>
          <option value="sans">Sans-serif</option><option value="serif">Serif</option><option value="mono">Monospace</option>
        </select>
      </label>
      <label>Text size: {settings.fontSize}px
        <input type="range" min={14} max={32} value={settings.fontSize} onChange={(e) => set('fontSize', +e.target.value)} />
      </label>
      <label className="row"><input type="checkbox" checked={settings.orp} onChange={(e) => set('orp', e.target.checked)} /> Highlight focus letter in flash reader</label>
      <label className="row"><input type="checkbox" checked={settings.bionic} onChange={(e) => set('bionic', e.target.checked)} /> Bionic emphasis (bold word starts)</label>
      <label>Beat tempo: {settings.beatBpm} bpm
        <input type="range" min={60} max={160} step={5} value={settings.beatBpm} onChange={(e) => set('beatBpm', +e.target.value)} />
      </label>
    </div>
  );
}
