export type ChecklistProgress = Record<string, string[]>;
export type ChecklistPersistence = 'available' | 'unavailable' | 'invalid';

export type ChecklistSnapshot = {
  progress: ChecklistProgress;
  persistence: ChecklistPersistence;
};

type ChecklistStorage = {
  read: () => string | null;
  write: (value: string) => void;
};

type LoadedProgress =
  | { status: 'available' | 'invalid'; progress: ChecklistProgress }
  | { status: 'unavailable' };

type Change =
  | { type: 'step'; slug: string; id: string; checked: boolean }
  | { type: 'reset'; slug: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function load(storage: ChecklistStorage): LoadedProgress {
  let raw: string | null;
  try {
    raw = storage.read();
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'available', progress: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'invalid', progress: {} };
  }
  if (!isRecord(parsed) || !isRecord(parsed.progress)) {
    return { status: 'invalid', progress: {} };
  }

  let invalid = false;
  const entries: [string, string[]][] = [];
  for (const [slug, ids] of Object.entries(parsed.progress)) {
    if (!Array.isArray(ids)) {
      invalid = true;
      continue;
    }
    const strings = ids.filter((id: unknown): id is string => typeof id === 'string');
    if (strings.length !== ids.length) invalid = true;
    entries.push([slug, [...new Set(strings)]]);
  }
  return { status: invalid ? 'invalid' : 'available', progress: Object.fromEntries(entries) };
}

function applyChanges(base: ChecklistProgress, changes: readonly Change[]): ChecklistProgress {
  let progress = base;
  for (const change of changes) {
    if (change.type === 'reset') {
      progress = { ...progress };
      delete progress[change.slug];
      continue;
    }
    const current = Object.hasOwn(progress, change.slug) ? progress[change.slug] : [];
    const next = change.checked
      ? current.includes(change.id) ? current : [...current, change.id]
      : current.filter(id => id !== change.id);
    progress = { ...progress, [change.slug]: next };
  }
  return progress;
}

export function createChecklistStore(storage: ChecklistStorage) {
  const initial = load(storage);
  let snapshot: ChecklistSnapshot = {
    progress: initial.status === 'unavailable' ? {} : initial.progress,
    persistence: initial.status,
  };
  let pending: Change[] = [];
  const listeners = new Set<() => void>();

  function update(progress: ChecklistProgress, persistence: ChecklistPersistence) {
    snapshot = { progress, persistence };
    listeners.forEach(listener => listener());
  }

  function synchronize() {
    const loaded = load(storage);
    if (loaded.status === 'unavailable') {
      update(snapshot.progress, 'unavailable');
      return;
    }
    const base = loaded.status === 'invalid'
      ? { ...snapshot.progress, ...loaded.progress }
      : loaded.progress;
    update(applyChanges(base, pending), pending.length ? 'unavailable' : loaded.status);
  }

  function save() {
    const loaded = load(storage);
    if (loaded.status === 'unavailable') {
      update(applyChanges(snapshot.progress, pending), 'unavailable');
      return;
    }
    const base = loaded.status === 'invalid'
      ? { ...snapshot.progress, ...loaded.progress }
      : loaded.progress;
    const progress = applyChanges(base, pending);
    try {
      storage.write(JSON.stringify({ progress }));
    } catch {
      update(progress, 'unavailable');
      return;
    }
    pending = [];
    update(progress, 'available');
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    synchronize,
    toggleStep(slug: string, id: string) {
      const current = Object.hasOwn(snapshot.progress, slug) ? snapshot.progress[slug] : [];
      pending.push({ type: 'step', slug, id, checked: !current.includes(id) });
      save();
    },
    resetProgress(slug: string) {
      pending.push({ type: 'reset', slug });
      save();
    },
    retryStorage() {
      if (pending.length) save();
      else synchronize();
    },
  };
}
