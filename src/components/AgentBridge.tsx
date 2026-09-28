import { useEffect, useRef } from 'react';
import { useApp } from '../state';
import { PASSAGES } from '../data/passages';
import { DRILLS } from '../lib/drills';
import { decodePayload, validateReaderPayload } from '../lib/handoff';
import { deliverToReader } from '../lib/inbox';
import { loadPromptOptions } from '../lib/promptStore';
import { recommendWpm, sanitizeSettings, summarize } from '../lib/storage';
import { drillRoute, type AppState, type BridgeCommand } from '../lib/protocol';
import { connectBridge, resumeBridge, setBridgeHandler } from '../lib/bridgeClient';

const SECTIONS = new Set(['', 'home', 'train', 'read', 'agent', 'progress', 'learn', 'agents']);

/**
 * Connects the app to the user's agent: handles pairing and deep links in
 * the URL, and carries out commands arriving over the local bridge.
 */
export function AgentBridge() {
  const app = useApp();
  const ref = useRef(app);
  ref.current = app;

  useEffect(() => {
    setBridgeHandler(async (cmd: BridgeCommand) => {
      const { settings, history, updateSettings } = ref.current;
      switch (cmd.type) {
        case 'get_state': {
          const limit = Math.max(1, Math.min(100, cmd.limit ?? 20));
          const state: AppState = {
            route: window.location.hash.replace(/^#\/?/, '') || 'home',
            settings,
            summary: summarize(history),
            recommendedWpm: recommendWpm(history, settings.wpm),
            recentSessions: history.slice(-limit),
            promptOptions: loadPromptOptions(),
          };
          return state;
        }
        case 'navigate': {
          const route = String(cmd.route ?? '').replace(/^[#/]+/, '');
          if (!SECTIONS.has(route.split(/[/?]/)[0])) throw new Error(`Unknown page: ${route}`);
          window.location.hash = `/${route}`;
          return { route };
        }
        case 'load_reader': {
          const payload = validateReaderPayload(cmd.payload);
          if (!payload) throw new Error('Invalid reader payload: text is required');
          deliverToReader(payload);
          window.location.hash = '/read';
          return { loaded: true, words: payload.text.trim().split(/\s+/).length, questions: payload.questions?.length ?? 0 };
        }
        case 'start_drill': {
          if (!DRILLS.some((d) => d.id === cmd.drill)) throw new Error(`Unknown drill: ${cmd.drill}`);
          if (cmd.passageId && !PASSAGES.some((p) => p.id === cmd.passageId)) throw new Error(`Unknown passage: ${cmd.passageId}`);
          const route = drillRoute(cmd.drill, {
            passageId: cmd.passageId,
            wpm: cmd.wpm ?? recommendWpm(history, settings.wpm),
            chunkSize: cmd.chunkSize,
          });
          window.location.hash = `/${route}`;
          return { route };
        }
        case 'update_settings': {
          const patch = sanitizeSettings((cmd.patch ?? {}) as Record<string, unknown>);
          updateSettings(patch);
          return { settings: { ...settings, ...patch } };
        }
        default:
          throw new Error(`Unsupported command: ${(cmd as { type?: string }).type}`);
      }
    });
  }, []);

  // Pairing parameters and deep-link payloads in the URL.
  useEffect(() => {
    const process = async () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const [path, query = ''] = hash.split('?');
      const params = new URLSearchParams(query);
      let changed = false;

      const port = Number(params.get('port'));
      const token = params.get('token');
      if (token && Number.isInteger(port) && port > 0 && port < 65536) {
        connectBridge({ port, token });
        params.delete('port');
        params.delete('token');
        changed = true;
      }

      const d = params.get('d');
      if (d && path === 'read') {
        params.delete('d');
        changed = true;
        try {
          const payload = validateReaderPayload(await decodePayload(d));
          if (payload) deliverToReader(payload);
        } catch { /* malformed link: ignore */ }
      }

      if (changed) {
        const rest = params.toString();
        // Keep secrets and large payloads out of history and bookmarks.
        window.history.replaceState(null, '', `#/${path}${rest ? `?${rest}` : ''}`);
      }
    };
    void process();
    resumeBridge();
    window.addEventListener('hashchange', process);
    return () => window.removeEventListener('hashchange', process);
  }, []);

  return null;
}
