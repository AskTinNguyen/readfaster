/** Generators for the eye-span drills. */

export function shuffle<T>(items: T[], rand = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A Schulte table: the numbers 1..size² in random order. */
export function schulteGrid(size: number, rand = Math.random): number[] {
  return shuffle(
    Array.from({ length: size * size }, (_, i) => i + 1),
    rand,
  );
}

const SPAN_WORDS = (
  'time year people way day man thing woman life child world school state family ' +
  'student group country problem hand part place case week company system program ' +
  'question work number night point home water room mother area money story fact ' +
  'month lot right study book eye job word business issue side kind head house ' +
  'service friend father power hour game line end member law car city community ' +
  'name president team minute idea kid body information back parent face others ' +
  'level office door health person art war history party result change morning ' +
  'reason research girl guy moment air teacher force education foot boy age policy ' +
  'music market sense nation plan college interest death experience effect class ' +
  'control care field development role effort rate heart drug show leader light ' +
  'voice wife police mind price report decision son view relationship town road ' +
  'arm difference value building action model season society tax director position ' +
  'player record paper space ground form event official matter center couple site ' +
  'project activity star table need court oil situation cost industry figure street ' +
  'image phone data picture practice piece land product doctor wall patient worker ' +
  'news test movie north love support technology step baby computer type attention ' +
  'film tree source organization hair window evidence population floor garden river'
).split(' ');

/** Random distinct words for the span-flash drill. */
export function spanWords(count: number, rand = Math.random): string[] {
  return shuffle(SPAN_WORDS, rand).slice(0, count);
}

/** Random digit string, e.g. for a numeric span. */
export function spanDigits(count: number, rand = Math.random): string {
  return Array.from({ length: count }, () => Math.floor(rand() * 10)).join('');
}

/** Normalised comparison of the user's recall against the target words. */
export function scoreRecall(target: string[], answer: string): number {
  const said = new Set(
    answer
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  const hits = target.filter((w) => said.has(w.toLowerCase())).length;
  return target.length ? hits / target.length : 0;
}
