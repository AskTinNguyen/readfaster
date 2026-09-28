export function Learn() {
  return (
    <div className="page prose">
      <h1>How it works</h1>
      <p className="lede">
        The three classic speed-reading techniques, what the research says about them, and a reading strategy built for AI output.
      </p>

      <h2>1. Visual pacing</h2>
      <p>
        Running a finger, pen or cursor under the line gives your eyes a target that keeps moving forward. Untrained
        readers make frequent <strong>regressions</strong>, jumping back to re-read. Many are habit rather than need.
        A pacer cuts them and steadies your rhythm.
      </p>
      <p><em>In the app:</em> the <a href="#/train/pacer">Visual pacer</a> and the Reader's Pacer mode. Turn on <strong>fade read</strong> to dim words you've passed so going back feels unnatural.</p>

      <h2>2. Reducing subvocalization</h2>
      <p>
        Subvocalization is the inner voice that sounds out words. It ties your reading speed to speaking speed, around
        150–250 wpm. You can't switch it off completely, and it helps comprehension of hard text. But you can stop it
        voicing every word, especially filler.
      </p>
      <p>
        <em>In the app:</em> the <a href="#/train/rsvp">Flash reader</a> and <a href="#/train/ramp">Speed ramp</a> show words faster than
        you can say them. The optional <strong>inner-voice blocker</strong> plays a soft beat to hum or tap along to, which keeps the voice busy.
      </p>

      <h2>3. Chunking</h2>
      <p>
        Each eye fixation takes in more than one word. Skilled readers use this <strong>perceptual span</strong> to read
        phrases ("in the next release", "because the cache expired") as single units of meaning.
      </p>
      <p>
        <em>In the app:</em> the <a href="#/train/chunk">Chunk reader</a> flashes phrase-aligned groups of 2–5 words. The
        <a href="#/train/span"> Flash span</a> and <a href="#/train/schulte">Schulte table</a> drills train you to notice more around each fixation point.
      </p>

      <h2>What the evidence says</h2>
      <div className="callout">
        <p>
          Reading research (e.g. Rayner et al., 2016, <em>So Much to Read, So Little Time</em>) finds a real <strong>speed–comprehension
          trade-off</strong>. Claims of 1,000+ wpm with full understanding don't hold up. What does work: practice, a steady forward rhythm,
          vocabulary and background knowledge, and above all <strong>strategic skimming</strong>, knowing what to read closely and what to skip.
        </p>
        <p>
          That's why ReadFaster scores <strong>effective speed</strong> (speed × comprehension), not raw wpm. Treat the flash reader as a drill,
          not a way to read important material: it stops you glancing back, and sometimes glancing back is how you understand.
        </p>
      </div>

      <h2>Reading AI output: triage first</h2>
      <p>The biggest time savings don't come from reading every word faster. They come from not reading words that don't matter.</p>
      <ol>
        <li><strong>Read the first sentence or TL;DR.</strong> Good output puts the answer there. If it doesn't, the answer is probably at the end.</li>
        <li><strong>Scan the shape.</strong> Headings, bold text, lists and tables tell you where the facts are.</li>
        <li><strong>Decide how deep to go.</strong> A status update needs 10 seconds; a design decision you'll act on deserves full attention.</li>
        <li><strong>Read closely only what's costly to get wrong:</strong> decisions, numbers, diffs, risks, anything you must do.</li>
        <li><strong>Ask instead of reading.</strong> A one-line follow-up ("just the decision and why") beats reading 600 words. See <a href="#/agent/steer">follow-up commands</a>.</li>
      </ol>

      <h2>Make agents write for fast reading</h2>
      <ul>
        <li><strong>Bottom line up front.</strong> The first sentence is the one you always read.</li>
        <li><strong>No filler.</strong> "Great question!" and "I hope this helps!" cost time and carry nothing.</li>
        <li><strong>Short sentences, one idea per paragraph.</strong> Fewer re-reads.</li>
        <li><strong>Lists and tables for parallel items.</strong> Your eyes scan down instead of parsing prose.</li>
        <li><strong>A word budget.</strong> Length drives reading time more than anything else.</li>
        <li><strong>Explicit uncertainty</strong>, stated once, instead of hedges in every sentence.</li>
      </ul>
      <p>
        Build these into a reusable instruction with the <a href="#/agent/prompt">style prompt builder</a>. Put it in your agent's system prompt,
        your repo's CLAUDE.md or AGENTS.md, or your chat app's custom instructions.
      </p>
    </div>
  );
}
