/** The user's saved style-prompt options, shared by the builder page and the agent bridge. */
import { defaultOptions, type BuildOptions } from './promptBuilder';

const PROMPT_KEY = 'readfaster.prompt.v1';

export function loadPromptOptions(): BuildOptions {
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

export function savePromptOptions(opts: BuildOptions) {
  try { localStorage.setItem(PROMPT_KEY, JSON.stringify(opts)); } catch { /* ignore */ }
}
