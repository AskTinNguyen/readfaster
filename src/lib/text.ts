/**
 * Text utilities shared by the trainers and the agent-output analyzer:
 * tokenizing, phrase chunking, pacing delays, and readability formulas.
 */

export interface Token {
  text: string;
  /** Index of the paragraph this word belongs to. */
  para: number;
  /** True for the last word of a paragraph. */
  paraEnd: boolean;
  /** True when the word ends a sentence (. ! ? or a closing quote after one). */
  sentenceEnd: boolean;
}

const SENTENCE_END = /[.!?]["')\]]*$/;
const CLAUSE_END = /[,;:—–]["')\]]*$/;

/** Splits text into word tokens, keeping paragraph and sentence boundaries. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  paragraphs.forEach((para, pi) => {
    const words = para.split(/\s+/).filter(Boolean);
    words.forEach((w, wi) => {
      tokens.push({
        text: w,
        para: pi,
        paraEnd: wi === words.length - 1,
        sentenceEnd: SENTENCE_END.test(w),
      });
    });
  });
  return tokens;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Optimal Recognition Point: the letter the eye should land on, slightly left
 * of centre. Used to align words in the RSVP display so the eye never moves.
 */
export function orpIndex(word: string): number {
  const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
  const lead = word.search(/[\p{L}\p{N}]/u);
  const offset = lead < 0 ? 0 : lead;
  let idx: number;
  if (letters <= 1) idx = 0;
  else if (letters <= 5) idx = 1;
  else if (letters <= 9) idx = 2;
  else if (letters <= 13) idx = 3;
  else idx = 4;
  return Math.min(word.length - 1, offset + idx);
}

/**
 * Relative display time for a word or chunk. Punctuation and long words get a
 * little extra time, the way a natural reader pauses at clause boundaries.
 */
export function delayMultiplier(tokens: Token[]): number {
  if (tokens.length === 0) return 1;
  const last = tokens[tokens.length - 1];
  let m = 0;
  for (const t of tokens) {
    const len = t.text.replace(/[^\p{L}\p{N}]/gu, '').length;
    m += len > 8 ? 1 + Math.min(0.6, (len - 8) * 0.08) : 1;
  }
  if (last.paraEnd) m += 1.5;
  else if (last.sentenceEnd) m += 1;
  else if (CLAUSE_END.test(last.text)) m += 0.5;
  return m;
}

/** Milliseconds a group of tokens should stay on screen at the given WPM. */
export function displayMs(tokens: Token[], wpm: number): number {
  return (60000 / wpm) * delayMultiplier(tokens);
}

const FUNCTION_WORDS = new Set(
  (
    'a an the of to in on at by for with from into onto over under about as ' +
    'and or but nor so yet if than that which who whom whose is are was were be ' +
    'been being am do does did has have had not no its it this these those my ' +
    'your our their his her can could will would should may might must'
  ).split(' '),
);

const isFunctionWord = (t: Token) => FUNCTION_WORDS.has(t.text.toLowerCase().replace(/[^\p{L}]/gu, ''));

/**
 * Groups tokens into phrase-like chunks of up to `size` words. Chunks never
 * cross a sentence end, and a chunk avoids ending on a function word
 * ("of", "the") when it can, so each chunk reads as a unit of meaning.
 */
export function chunkTokens(tokens: Token[], size: number): Token[][] {
  if (size <= 1) return tokens.map((t) => [t]);
  const chunks: Token[][] = [];
  let cur: Token[] = [];

  const flush = () => {
    if (cur.length) chunks.push(cur);
    cur = [];
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    cur.push(t);
    const boundary = t.sentenceEnd || t.paraEnd || CLAUSE_END.test(t.text);
    if (boundary) {
      flush();
      continue;
    }
    if (cur.length >= size) {
      // Carry trailing function words ("of the") into the next chunk.
      const carried: Token[] = [];
      while (cur.length > 1 && i < tokens.length - 1 && isFunctionWord(cur[cur.length - 1])) {
        carried.unshift(cur.pop()!);
      }
      flush();
      cur = carried;
    }
  }
  flush();
  return chunks;
}

/** Splits a word for "bionic" display: a bolded lead-in and the remainder. */
export function bionicSplit(word: string): [string, string] {
  const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length;
  if (letters === 0) return ['', word];
  const boldLetters = letters <= 3 ? 1 : Math.ceil(letters * 0.45);
  let seen = 0;
  for (let i = 0; i < word.length; i++) {
    if (/[\p{L}\p{N}]/u.test(word[i])) seen++;
    if (seen === boldLetters) return [word.slice(0, i + 1), word.slice(i + 1)];
  }
  return [word, ''];
}

/** Rough English syllable count, good enough for readability formulas. */
export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Splits prose into sentences. Abbreviation handling is deliberately simple. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])["')\]]*\s+(?=["'(\[]?[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

export interface Readability {
  words: number;
  sentences: number;
  syllables: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  /** Flesch Reading Ease: higher is easier. 60-70 is plain English. */
  fleschEase: number;
  /** Flesch-Kincaid grade level. */
  grade: number;
}

export function readability(text: string): Readability {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const wc = Math.max(1, words.length);
  const sc = Math.max(1, sentences.length);
  const asl = wc / sc;
  const asw = syllables / wc;
  return {
    words: words.length,
    sentences: sentences.length,
    syllables,
    avgSentenceLength: asl,
    avgSyllablesPerWord: asw,
    fleschEase: 206.835 - 1.015 * asl - 84.6 * asw,
    grade: 0.39 * asl + 11.8 * asw - 15.59,
  };
}

/** Reading time in seconds for a word count at a given speed. */
export function readingSeconds(words: number, wpm: number): number {
  return wpm > 0 ? (words / wpm) * 60 : 0;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Strips the most common Markdown syntax so agent output can be fed to the
 * word-by-word trainers. Code blocks are replaced by a short placeholder.
 */
export function markdownToPlain(md: string): string {
  return md
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, '\n\n[code block]\n\n')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, '\n$1.\n')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '\n')
    .replace(/^\s*\d+[.)]\s+/gm, '\n')
    .replace(/^\s*\|?[\s:-]+\|[\s|:-]*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[^*\w])[*_]([^*_\n]+)[*_](?=[^*\w]|$)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
