import { useSyncExternalStore } from 'react';
import { createChecklistStore } from './checklist-store';
import { downloadBlob } from './download';

const KEY = 'launchpad.v1';
const store = createChecklistStore({
  read: () => localStorage.getItem(KEY),
  write: value => localStorage.setItem(KEY, value),
});

function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== null) return;
  try {
    if (event.storageArea !== window.localStorage) return;
  } catch {
    store.synchronize();
    return;
  }
  store.synchronize();
}

let subscribers = 0;
function subscribe(listener: () => void) {
  const unsubscribe = store.subscribe(listener);
  subscribers += 1;
  if (subscribers === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
    store.synchronize();
  }
  return () => {
    unsubscribe();
    subscribers -= 1;
    if (subscribers === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}

export function useLocalStore() {
  const snapshot = useSyncExternalStore(subscribe, store.getSnapshot, store.getSnapshot);
  return {
    ...snapshot,
    toggleStep: store.toggleStep,
    resetProgress: store.resetProgress,
    retryStorage: store.retryStorage,
  };
}

export function downloadText(filename: string, content: string, type = 'text/plain') {
  downloadBlob(filename, new Blob([content], { type }));
}
