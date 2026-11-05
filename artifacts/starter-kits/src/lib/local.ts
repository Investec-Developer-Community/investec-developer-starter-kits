import { useCallback, useEffect, useState } from 'react';

const KEY = 'launchpad.v1';
type State = { progress: Record<string, string[]> };
const empty: State = { progress: {} };

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw);
    if (!p || !p.progress || typeof p.progress !== 'object' || Array.isArray(p.progress)) return empty;
    // Keep the legacy key and all string checklist IDs, ignoring obsolete bookmarks.
    // Validate each kit independently so one malformed entry cannot erase others.
    return { progress: Object.fromEntries(
      Object.entries(p.progress).filter(([, ids]) => Array.isArray(ids))
        .map(([slug, ids]) => [slug, [...new Set((ids as unknown[]).filter((id): id is string => typeof id === 'string'))]]),
    ) };
  } catch {
    return empty;
  }
}

const listeners = new Set<(s: State) => void>();
function write(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l(s));
}

export function useLocalStore() {
  const [state, setState] = useState<State>(read);
  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);
  const toggleStep = useCallback((slug: string, id: string) => {
    const s = read();
    const cur = s.progress[slug] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    write({ ...s, progress: { ...s.progress, [slug]: next } });
  }, []);
  const resetProgress = useCallback((slug: string) => {
    const s = read();
    const progress = { ...s.progress };
    delete progress[slug];
    write({ ...s, progress });
  }, []);
  return { ...state, toggleStep, resetProgress };
}

export function downloadText(filename: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
