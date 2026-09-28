/**
 * Optional Claude integration: rewrite agent output for fast reading and
 * generate comprehension quizzes for pasted text. Runs entirely in the
 * browser with the user's own API key; nothing goes to any other server.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { Question } from '../data/types';

type Sdk = typeof import('@anthropic-ai/sdk').default;
let sdkRef: Sdk | null = null;

/** The SDK is loaded on first use so it doesn't weigh down the rest of the app. */
async function sdk(): Promise<Sdk> {
  sdkRef ??= (await import('@anthropic-ai/sdk')).default;
  return sdkRef;
}

export const AI_MODELS = [
  { id: 'claude-opus-5', label: 'Claude Opus 5 (best quality)' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (faster, cheaper)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
] as const;

export interface AiConfig {
  apiKey: string;
  model: string;
  /** Persist the key in localStorage instead of only this tab's session. */
  remember: boolean;
}

const KEY = 'readfaster.ai.v1';

export function loadAiConfig(): AiConfig {
  const empty: AiConfig = { apiKey: '', model: AI_MODELS[0].id, remember: false };
  try {
    const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

export function saveAiConfig(c: AiConfig) {
  try {
    const raw = JSON.stringify(c);
    sessionStorage.setItem(KEY, raw);
    if (c.remember) localStorage.setItem(KEY, raw);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: config lives for this page view only */
  }
}

export function clearAiConfig() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

async function client(c: AiConfig): Promise<Anthropic> {
  const Anthropic = await sdk();
  // The key belongs to the user and never leaves their browser except to the API.
  return new Anthropic({ apiKey: c.apiKey, dangerouslyAllowBrowser: true });
}

/** Server-side refusal fallback is available on Opus 5 only among these models. */
function fallbackParams(model: string) {
  return model === 'claude-opus-5'
    ? { betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[], fallbacks: 'default' as const }
    : {};
}

export function describeError(e: unknown): string {
  const Anthropic = sdkRef;
  if (!Anthropic) return e instanceof Error ? e.message : String(e);
  if (e instanceof Anthropic.AuthenticationError) return 'The API key was rejected. Check it in AI settings.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This key does not have access to that model.';
  if (e instanceof Anthropic.NotFoundError) return 'Model not found for this key. Try another model in AI settings.';
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited. Wait a moment and try again.';
  if (e instanceof Anthropic.BadRequestError) return `Request rejected: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Could not reach the API. Check your connection.';
  if (e instanceof Anthropic.APIError) return `API error ${e.status ?? ''}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

/**
 * Rewrites text following the given style instructions, streaming the
 * result through `onText`. Resolves with the final text.
 */
export async function rewriteForFastReading(
  c: AiConfig,
  styleInstructions: string,
  text: string,
  onText: (snapshot: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const system =
    `You rewrite AI-generated text so a busy reader can take it in quickly without losing information.\n\n` +
    `${styleInstructions}\n\n` +
    `Rules for the rewrite:\n` +
    `- Keep every fact, number, name, decision, caveat and action item from the original. Do not add new claims.\n` +
    `- Keep code blocks and file paths exactly as written.\n` +
    `- Output only the rewritten text in Markdown, with no commentary about the rewrite.`;

  const stream = (await client(c)).beta.messages.stream(
    {
      model: c.model,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content: `<original>\n${text}\n</original>` }],
      ...fallbackParams(c.model),
    },
    { signal },
  );
  stream.on('text', (_delta, snapshot) => onText(snapshot));
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('The model declined to rewrite this text.');
  return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

const QUIZ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['prompt', 'options', 'answer'],
        properties: {
          prompt: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'integer', description: '0-based index of the correct option' },
        },
      },
    },
  },
};

/** Generates multiple-choice questions that test the key points of `text`. */
export async function generateQuiz(c: AiConfig, text: string, count = 5): Promise<Question[]> {
  const msg = await (await client(c)).beta.messages.create({
    model: c.model,
    max_tokens: 16000,
    system:
      'You write reading-comprehension checks. Questions test whether the reader retained the key information: ' +
      'the main point, decisions, numbers, risks and action items. Never ask about wording or trivia. ' +
      'Each question has exactly 4 plausible options, one correct, answerable only from the text. Vary the position of the correct answer.',
    messages: [{ role: 'user', content: `Write ${count} questions for this text:\n\n<text>\n${text}\n</text>` }],
    output_config: { format: { type: 'json_schema', schema: QUIZ_SCHEMA } },
    ...fallbackParams(c.model),
  });
  if (msg.stop_reason === 'refusal') throw new Error('The model declined to write a quiz for this text.');
  const raw = msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  const parsed = JSON.parse(raw) as { questions: Question[] };
  return parsed.questions.filter(
    (q) => q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
  );
}
