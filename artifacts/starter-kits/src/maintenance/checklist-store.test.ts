import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChecklistStore } from '../lib/checklist-store.ts';

function fakeStorage(value: string | null = null) {
  const state = { value, failRead: false, failWrite: false };
  return {
    state,
    storage: {
      read() {
        if (state.failRead) throw new Error('read unavailable');
        return state.value;
      },
      write(next: string) {
        if (state.failWrite) throw new Error('write unavailable');
        state.value = next;
      },
    },
  };
}

test('preserves valid legacy progress while reporting and repairing malformed entries', () => {
  const fake = fakeStorage(JSON.stringify({
    saved: ['obsolete'],
    progress: { first: ['a', 'a', 1, 'b'], broken: { id: 'a' }, second: ['c'] },
  }));
  const store = createChecklistStore(fake.storage);
  assert.deepEqual(store.getSnapshot(), {
    persistence: 'invalid',
    progress: { first: ['a', 'b'], second: ['c'] },
  });

  store.toggleStep('first', 'b');
  assert.deepEqual(store.getSnapshot(), {
    persistence: 'available',
    progress: { first: ['a'], second: ['c'] },
  });
  assert.deepEqual(JSON.parse(fake.state.value!), {
    progress: { first: ['a'], second: ['c'] },
  });
});

test('retains failed changes and merges them into the latest stored progress on retry', () => {
  const fake = fakeStorage(JSON.stringify({ progress: { first: ['one'], second: ['old'] } }));
  const store = createChecklistStore(fake.storage);
  fake.state.failRead = true;
  store.toggleStep('first', 'two');
  store.toggleStep('first', 'three');
  store.toggleStep('first', 'one');
  store.resetProgress('second');
  assert.deepEqual(store.getSnapshot(), {
    persistence: 'unavailable',
    progress: { first: ['two', 'three'] },
  });

  fake.state.value = JSON.stringify({
    progress: { first: ['one', 'external'], second: ['old', 'external'], third: ['keep'] },
  });
  fake.state.failRead = false;
  fake.state.failWrite = true;
  store.retryStorage();
  assert.deepEqual(store.getSnapshot(), {
    persistence: 'unavailable',
    progress: { first: ['external', 'two', 'three'], third: ['keep'] },
  });
  assert.deepEqual(JSON.parse(fake.state.value), {
    progress: { first: ['one', 'external'], second: ['old', 'external'], third: ['keep'] },
  });

  fake.state.failWrite = false;
  store.retryStorage();
  assert.deepEqual(store.getSnapshot(), {
    persistence: 'available',
    progress: { first: ['external', 'two', 'three'], third: ['keep'] },
  });
  assert.deepEqual(JSON.parse(fake.state.value!), {
    progress: { first: ['external', 'two', 'three'], third: ['keep'] },
  });
});

test('synchronization incorporates external edits without losing pending local changes', () => {
  const fake = fakeStorage(JSON.stringify({ progress: { first: ['a'] } }));
  const store = createChecklistStore(fake.storage);
  fake.state.failWrite = true;
  store.toggleStep('first', 'b');
  fake.state.value = JSON.stringify({ progress: { first: ['a', 'external'], other: ['x'] } });
  store.synchronize();
  assert.deepEqual(store.getSnapshot(), {
    persistence: 'unavailable',
    progress: { first: ['a', 'external', 'b'], other: ['x'] },
  });

  fake.state.failWrite = false;
  store.retryStorage();
  assert.deepEqual(JSON.parse(fake.state.value!), {
    progress: { first: ['a', 'external', 'b'], other: ['x'] },
  });
});

test('does not overwrite unreadable storage just because a retry was requested', () => {
  const fake = fakeStorage('{');
  const store = createChecklistStore(fake.storage);
  store.retryStorage();
  assert.equal(fake.state.value, '{');
  assert.equal(store.getSnapshot().persistence, 'invalid');
  store.toggleStep('first', 'a');
  assert.equal(store.getSnapshot().persistence, 'available');
  assert.deepEqual(JSON.parse(fake.state.value!), { progress: { first: ['a'] } });
});

test('retry reloads existing progress after read access is restored without writing', () => {
  const saved = JSON.stringify({ progress: { first: ['a'] } });
  const fake = fakeStorage(saved);
  fake.state.failRead = true;
  const store = createChecklistStore(fake.storage);
  assert.deepEqual(store.getSnapshot(), { persistence: 'unavailable', progress: {} });
  fake.state.failRead = false;
  fake.state.failWrite = true;
  store.retryStorage();
  assert.deepEqual(store.getSnapshot(), { persistence: 'available', progress: { first: ['a'] } });
  assert.equal(fake.state.value, saved);
});

test('handles prototype-like kit keys and notifies only active subscribers', () => {
  const fake = fakeStorage('{"progress":{"__proto__":["a"],"constructor":["b"]}}');
  const store = createChecklistStore(fake.storage);
  const snapshots: string[] = [];
  const unsubscribe = store.subscribe(() => snapshots.push(JSON.stringify(store.getSnapshot().progress)));
  store.toggleStep('__proto__', 'c');
  assert.deepEqual(JSON.parse(fake.state.value!).progress['__proto__'], ['a', 'c']);
  unsubscribe();
  store.resetProgress('__proto__');
  assert.equal(snapshots.length, 1);
  assert.deepEqual(JSON.parse(fake.state.value!), { progress: { constructor: ['b'] } });
});
