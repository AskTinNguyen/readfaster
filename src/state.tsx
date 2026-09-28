import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  loadHistory,
  loadSettings,
  newId,
  saveHistory,
  saveSettings,
  type SessionRecord,
  type Settings,
} from './lib/storage';

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  history: SessionRecord[];
  addSession: (r: Omit<SessionRecord, 'id' | 'date'>) => SessionRecord;
  clearHistory: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [history, setHistory] = useState<SessionRecord[]>(loadHistory);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveHistory(history), [history]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const addSession = useCallback((r: Omit<SessionRecord, 'id' | 'date'>) => {
    const rec: SessionRecord = { ...r, id: newId(), date: new Date().toISOString() };
    setHistory((h) => [...h, rec]);
    return rec;
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo(
    () => ({ settings, updateSettings, history, addSession, clearHistory }),
    [settings, updateSettings, history, addSession, clearHistory],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
