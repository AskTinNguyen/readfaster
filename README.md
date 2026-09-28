# ReadFaster

Train your reading speed, and get AI agents to write text that's faster to read.

**Live app:** https://readfaster-sooty.vercel.app

Agents now produce more text than anyone can read. ReadFaster works on both sides:

- **You**: interactive drills for the three core speed-reading techniques, scored on *effective* speed (words per minute × comprehension), so speed never outruns understanding.
- **Your agents**: analyze any agent response for how fast it reads, tighten it, and generate reusable style instructions for system prompts, `CLAUDE.md` / `AGENTS.md`, or chat custom instructions.

ReadFaster has **no AI model of its own**. People bring their own agent (Claude Code, Codex, Cursor, Claude Desktop, or any MCP client) and connect it through the bundled **MCP server** or **CLI**.

## Use it from your agent

### MCP server

Claude Code:

```bash
claude mcp add readfaster -- npx -y github:AskTinNguyen/readfaster mcp
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.readfaster]
command = "npx"
args = ["-y", "github:AskTinNguyen/readfaster", "mcp"]
```

Cursor, Claude Desktop and other MCP clients:

```json
{ "mcpServers": { "readfaster": { "command": "npx", "args": ["-y", "github:AskTinNguyen/readfaster", "mcp"] } } }
```

Requires Node.js 20.12+.

| Tool | What it does | Needs the app open? |
|---|---|---|
| `analyze_readability` | Scores text 0–100 for fast reading, with findings (buried answer, filler, long sentences, walls of text). | No |
| `tighten_text` | Removes stock openers, sign-offs and wordy phrases; code is untouched. | No |
| `get_style_prompt` | Fast-read writing instructions: the user's saved style (if the app is connected) or a preset. | Optional |
| `list_training_content` | Drills and practice passages. | No |
| `send_to_reader` | Opens text in the Reader (formatted, pacer, chunk or flash), optionally with quiz questions the agent wrote. | Opens it |
| `start_drill` | Starts a drill, by default at the user's recommended speed. | Opens it |
| `open_app` | Opens or pairs ReadFaster in the browser. | Opens it |
| `get_progress` | Speed, comprehension, streak, recommended speed and recent sessions. | Yes |
| `update_settings` | Reading speed, chunk size, font, theme and display options. | Yes |

There's also a `fast_read_style` prompt that applies the style to the rest of a conversation.

Things to ask your agent:

- "Before you reply, run analyze_readability on your draft and fix anything below 80."
- "Send your summary of this PR to my ReadFaster reader in pacer mode, with 4 comprehension questions."
- "Check my ReadFaster progress and start today's drill at the recommended speed."

### CLI

Any agent that can run shell commands can use the CLI directly, with no MCP needed:

```bash
npx -y github:AskTinNguyen/readfaster analyze reply.md          # score + findings (--json for machines)
npx -y github:AskTinNguyen/readfaster tighten reply.md          # strip filler, print result
npx -y github:AskTinNguyen/readfaster prompt --preset coding --target claude-md >> CLAUDE.md
npx -y github:AskTinNguyen/readfaster read report.md --mode pacer --wpm 350
npx -y github:AskTinNguyen/readfaster drill chunk --wpm 400
pbpaste | npx -y github:AskTinNguyen/readfaster analyze -
```

Run `readfaster help` for all options. Environment variables: `READFASTER_APP_URL` (point at another deployment), `READFASTER_PORT` (bridge port, default 47625), `READFASTER_NO_OPEN=1` (print links instead of opening the browser), `READFASTER_ALLOWED_ORIGINS` (extra origins allowed to pair, e.g. preview deployments).

### How the app connection works

```
agent ──stdio (MCP)──▶ readfaster mcp ──127.0.0.1 bridge (SSE + POST)──▶ ReadFaster tab in the browser
```

- `readfaster mcp` also runs a small HTTP bridge bound to `127.0.0.1`. The first app tool the agent calls opens a **pairing link**. The tab then connects to the bridge and carries out commands. Progress and settings never leave the browser.
- The bridge rejects requests that come from any other origin, that name a non-loopback host (which blocks DNS rebinding), or that lack the pairing token. The token is stored per machine in `~/.readfaster/bridge.json` (mode 600), so a browser paired once stays paired.
- Text sent without a live connection travels in the URL **fragment**, which browsers never send to a server.
- Chrome may ask to allow access to the local network the first time. If the local connection is blocked, text still arrives via links.

## Features

### Train (`#/train`)

| Drill | Technique | What it does |
|---|---|---|
| Speed test | Baseline | Timed normal reading + 5-question quiz. Gives raw and effective wpm. |
| Visual pacer | Pacing | A guide (highlight, underline or paragraph window) sweeps through the text. "Fade read" dims passed words to stop back-skipping. |
| Chunk reader | Chunking | Phrase-aligned groups of 2–5 words flash as single units. |
| Flash reader (RSVP) | Subvocalization | One word at a time, aligned on its optimal recognition point. |
| Speed ramp | Subvocalization | RSVP that speeds up every 40 words, pushing past speaking speed. |
| Flash span | Chunking / eye span | Words flash around a fixation point; type what you saw. Adaptive. |
| Schulte table | Peripheral vision | Find 1–25 in order without moving your eyes from the centre. |

An optional inner-voice blocker plays a soft beat to hum along to. Recommended speed rises while quiz scores stay at 70% or above and falls when they drop.

### Reader (`#/read`)

Read pasted or agent-sent text with the pacer, chunk or flash reader, or in a formatted view with optional bionic emphasis. Afterwards, take the agent's quiz (scored into your progress) or write down what you remember.

### Agent output (`#/agent`)

- **Analyze**: a 0–100 fast-read score with findings and inline filler highlighting. **Tighten** cleans it up locally. **Copy rewrite request** produces a ready-to-paste request (your style prompt plus the text) for any agent. **Compare a rewrite** scores the agent's version against the original.
- **Style prompt builder**: 14 rules with presets for chat, coding agents, research reports and status updates, exported for a system prompt, `CLAUDE.md`/`AGENTS.md`, chat custom instructions or a one-off message.
- **Follow-up commands**: copy-ready messages that reshape a bloated answer.

### Progress (`#/progress`) and Agents (`#/agents`)

Speed-over-time chart, session history and JSON export. The Agents page has setup snippets, the connection status and a disconnect button.

## Development

```bash
npm install
npm run dev          # web app dev server
npm test             # unit + integration tests (vitest)
npm run typecheck    # web app and CLI
npm run build        # typecheck + production build of the web app into dist/
npm run build:cli    # bundle the CLI/MCP server into bin/readfaster.cjs
```

`bin/readfaster.cjs` is a committed, dependency-free bundle so that `npx github:…` works without a build step. **Run `npm run build:cli` and commit the result whenever you change `cli/` or the shared code in `src/lib`.**

```
cli/          CLI entry, MCP server, local browser bridge
src/lib/      shared logic: text processing, analyzer, prompt builder, storage, hand-off links, bridge protocol
src/components, src/pages   the React app
src/data/     practice passages with quizzes, sample agent outputs
bin/          bundled CLI (generated)
```

Deployment: Vercel builds the web app from this repo (Vite preset). The CLI is not deployed; users run it locally.

## A note on the evidence

Reading research finds a real trade-off between speed and comprehension. Claims of 1,000+ wpm with full understanding don't hold up. The durable gains come from a steady forward rhythm, fewer unnecessary regressions, and strategic skimming. That's why the app scores effective speed and treats RSVP as a drill rather than a way to read important material. See the in-app **How it works** page.
