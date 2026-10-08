import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncPreferenceStore, SYNC_MODE } from '../src/persistence/SyncPreference.js';
import { createLocalSaveStore } from '../src/persistence/LocalSaveStore.js';

function memoryStorage() {
  const map = new Map();
  return { getItem: k => map.has(k) ? map.get(k) : null, setItem: (k,v) => map.set(k,String(v)) };
}

test('sync preference defaults to undecided and is scoped per account', () => {
  const store = createSyncPreferenceStore(memoryStorage());
  assert.equal(store.get('a'), null);
  store.set('a', SYNC_MODE.LOCAL);
  assert.equal(store.get('a'), SYNC_MODE.LOCAL);
  assert.equal(store.get('b'), null);
  store.set('a', SYNC_MODE.CLOUD);
  assert.equal(store.get('a'), SYNC_MODE.CLOUD);
});

test('invalid preference is rejected', () => {
  const store = createSyncPreferenceStore(memoryStorage());
  assert.throws(() => store.set('a', 'unknown'), RangeError);
  assert.throws(() => store.get(''), TypeError);
});

test('local save is isolated by account and survives adapter reinitialization', () => {
  const storage = memoryStorage();
  createLocalSaveStore(storage).save('a', { coins: 12 });
  const restored = createLocalSaveStore(storage);
  assert.deepEqual(restored.load('a'), { schemaVersion: 1, payload: { coins: 12 } });
  assert.equal(restored.load('b'), null);
});
