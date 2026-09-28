import { useState } from 'react';
import { useCopy } from '../hooks';
import { disconnectBridge, useBridge } from '../lib/bridgeClient';
import { MCP_TOOLS, PACKAGE_SPEC } from '../lib/agentDocs';

const NPX = `npx -y ${PACKAGE_SPEC}`;

const SETUPS: { id: string; label: string; intro: string; code: string }[] = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    intro: 'Run once in a terminal:',
    code: `claude mcp add readfaster -- ${NPX} mcp`,
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    intro: 'Add to ~/.codex/config.toml:',
    code: `[mcp_servers.readfaster]\ncommand = "npx"\nargs = ["-y", "${PACKAGE_SPEC}", "mcp"]`,
  },
  {
    id: 'json',
    label: 'Cursor, Claude Desktop, others',
    intro: 'Add to your client\'s MCP config (e.g. .cursor/mcp.json or claude_desktop_config.json):',
    code: JSON.stringify({ mcpServers: { readfaster: { command: 'npx', args: ['-y', PACKAGE_SPEC, 'mcp'] } } }, null, 2),
  },
  {
    id: 'cli',
    label: 'CLI only',
    intro: 'No MCP needed. Any agent that can run shell commands can use these:',
    code: [
      `${NPX} analyze reply.md          # fast-read score and findings (--json for agents)`,
      `${NPX} tighten reply.md          # strip filler, print the result`,
      `${NPX} prompt --preset coding --target claude-md >> CLAUDE.md`,
      `${NPX} read report.md --mode pacer --wpm 350`,
      `${NPX} drill chunk --wpm 400`,
      `pbpaste | ${NPX} analyze -       # read from stdin`,
    ].join('\n'),
  },
];

const EXAMPLES = [
  'Before you reply, run analyze_readability on your draft and fix anything below 80.',
  'Send your summary of this PR to my ReadFaster reader in pacer mode, with 4 comprehension questions.',
  'Check my ReadFaster progress and start today\'s drill at the recommended speed.',
  'Get my style prompt from ReadFaster and add it to this repo\'s CLAUDE.md.',
  'I keep scoring under 60% at 450 wpm. Lower my reading speed to 380 and switch the font to serif.',
];

export function Agents() {
  const bridge = useBridge();
  const [setup, setSetup] = useState(SETUPS[0].id);
  const [copied, copy] = useCopy();
  const current = SETUPS.find((s) => s.id === setup)!;

  return (
    <div className="page">
      <h1>Use ReadFaster from your agent</h1>
      <p className="lede">
        ReadFaster has no AI model of its own. Bring yours: Claude Code, Codex, Cursor or any MCP client can analyze
        and tighten text, fetch your style prompt, send reading into this app with quiz questions, start drills, and read your progress.
      </p>

      <div className={`panel bridge-status ${bridge.status}`}>
        <div className="row wrap">
          <span className={`agent-pill ${bridge.status}`}><span className="dot" /> {statusLabel(bridge.status)}</span>
          {bridge.pairing && <span className="muted small">local bridge on 127.0.0.1:{bridge.pairing.port}</span>}
          <span className="grow" />
          {bridge.status !== 'off' && <button className="btn small" onClick={() => disconnectBridge()}>Disconnect</button>}
        </div>
        <p className="small muted">
          {bridge.status === 'connected'
            ? 'Your agent can now control this tab.'
            : bridge.status === 'off'
              ? 'Once the MCP server is set up, ask your agent to "open ReadFaster". It opens a pairing link that connects this app to it.'
              : bridge.status === 'error'
                ? 'The agent bridge is not running or the pairing expired. Ask your agent to open ReadFaster again.'
                : 'Connecting to your agent…'}
        </p>
      </div>

      <h2>1. Connect your agent</h2>
      <div className="seg wrap" role="tablist">
        {SETUPS.map((s) => (
          <button key={s.id} className={setup === s.id ? 'on' : ''} onClick={() => setSetup(s.id)}>{s.label}</button>
        ))}
      </div>
      <p className="small">{current.intro}</p>
      <div className="code-block">
        <pre>{current.code}</pre>
        <button className="btn small" onClick={() => copy(current.code)}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <p className="muted small">
        Requires Node.js 20.12+. The package installs straight from GitHub; nothing is sent to any ReadFaster server.
      </p>

      <h2>2. Ask for things in plain language</h2>
      <ul className="examples">
        {EXAMPLES.map((e) => <li key={e}>"{e}"</li>)}
      </ul>

      <h2>What your agent can do</h2>
      <div className="table-wrap">
        <table className="history">
          <thead><tr><th>Tool</th><th>What it does</th><th>Needs this tab?</th></tr></thead>
          <tbody>
            {MCP_TOOLS.map((t) => (
              <tr key={t.name}>
                <td><code>{t.name}</code></td>
                <td>{t.summary}</td>
                <td className="small">{t.needsApp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How the connection works</h2>
      <ul className="small">
        <li>The MCP server runs on your machine and listens on <code>127.0.0.1</code> only. It accepts requests from this site's origin, and only with the pairing token from the link your agent opens.</li>
        <li>Text your agent sends travels in the URL fragment or over the local connection. It never reaches a ReadFaster server; your progress stays in this browser.</li>
        <li>Your browser may ask to allow access to devices on your local network the first time. That's this connection.</li>
        <li>If the local connection is blocked, tools that send text still work: they open a link with the content in it.</li>
      </ul>
    </div>
  );
}

function statusLabel(s: string) {
  return s === 'connected' ? 'Agent connected' : s === 'connecting' ? 'Connecting…' : s === 'error' ? 'Agent offline' : 'No agent paired';
}
