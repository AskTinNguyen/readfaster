/**
 * Hands payloads from the agent bridge or a deep link to the Reader page,
 * whether or not it is mounted yet.
 */
import { useSyncExternalStore } from 'react';
import type { ReaderPayload } from './handoff';

interface Delivery {
  payload: ReaderPayload;
  /** Increments per delivery so the same text sent twice still reloads. */
  seq: number;
}

let current: Delivery | null = null;
let seq = 0;
const listeners = new Set<() => void>();

export function deliverToReader(payload: ReaderPayload) {
  current = { payload, seq: ++seq };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useReaderInbox(): Delivery | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
