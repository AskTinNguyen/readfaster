# ReadFaster

Train your reading speed, and get AI agents to write text that's faster to read.

Agents now produce more text than anyone can read. ReadFaster works on both sides:

- **You**: interactive drills for the three core speed-reading techniques, scored on *effective* speed (words per minute × comprehension), so speed never outruns understanding.
- **Your agents**: analyze any agent response for how fast it reads, tighten or rewrite it, and generate reusable style instructions for system prompts, `CLAUDE.md` / `AGENTS.md`, or chat custom instructions.

## Features

### Train (`#/train`)

| Drill | Technique | What it does |
|---|---|---|
| Speed test | Baseline | Timed normal reading + 5-question quiz. Gives raw and effective wpm. |
| Visual pacer | Pacing | A guide (highlight, underline or paragraph window) sweeps through the text at your speed. "Fade read" dims passed words to stop back-skipping. |
| Chunk reader | Chunking | Phrase-aligned groups of 2–5 words flash as single units. Chunks never cross sentence boundaries or end on "of the". |
| Flash reader (RSVP) | Subvocalization | One word at a time, aligned on its optimal recognition point, so your eyes never move. |
| Speed ramp | Subvocalization | RSVP that speeds up every 40 words, pushing you past speaking speed. |
| Flash span | Chunking / eye span | Words flash around a fixation point; type what you saw. Adapts span length. |
| Schulte table | Peripheral vision | Find 1–25 in order without moving your eyes from the centre. |

The optional **inner-voice blocker** plays a soft beat to hum or tap along to during paced drills. The recommended speed rises when quiz scores stay at 70% or above and falls when they drop.

### Reader (`#/read`)

Paste any agent output (Markdown supported) and read it with the pacer, chunk or flash reader, or in a formatted view with optional bionic emphasis. Afterwards, check what you retained by writing down key points or, with Claude connected, taking an auto-generated quiz.

### Agent output (`#/agent`)

- **Analyze & rewrite**: a 0–100 fast-read score plus specific findings: buried answer, filler phrases (highlighted inline), long sentences, walls of text, missing structure, too much bold. **Tighten** strips stock openers, sign-offs and wordy phrases locally and deterministically. **Rewrite with Claude** does a full restyle using your style prompt.
- **Style prompt builder**: 14 rules (bottom line up front, word budget, no preamble, bullets, tables, explicit confidence…) with presets for chat, coding agents, research reports and status updates. Exports for a system prompt, `CLAUDE.md`/`AGENTS.md`, chat custom instructions, or a one-off message.
- **Follow-up commands**: copy-ready messages that reshape a bloated answer ("TL;DR", "Just the decision", "Table it", "What changed?").

### Progress (`#/progress`)

Baseline, latest and best effective speed, comprehension, streak, a speed-over-time chart and full session history (exportable as JSON). Aborted runs (under 30 words) and implausible results (over 1,500 wpm) are not saved.

## Privacy

Everything runs in the browser. Settings and history live in `localStorage`. The Claude features are optional. They call the Anthropic API directly from the browser with your own API key, which by default is kept only for the current tab.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # unit tests (vitest)
npm run typecheck
npm run build      # typecheck + production build into dist/
```

Stack: React 19, TypeScript, Vite. No backend.

```
src/
  lib/          text processing, analyzer, prompt builder, storage, drills, Claude client
  components/   RSVP, Pacer, SpeedTest, Quiz, Schulte, SpanDrill, Markdown renderer
  pages/        Home, Train, Reader, Agent, Progress, Learn
  data/         practice passages with quizzes, sample agent outputs
```

## A note on the evidence

Reading research finds a real trade-off between speed and comprehension. Claims of 1,000+ wpm with full understanding don't hold up. The durable gains come from a steady forward rhythm, fewer unnecessary regressions, and strategic skimming. That's why the app scores effective speed and treats RSVP as a drill rather than a way to read important material. See the in-app **How it works** page.
