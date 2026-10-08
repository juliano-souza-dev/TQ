// Account-scoped local-only save. Never performs network operations.
const PREFIX = 'tq:save:v1:';
export function createLocalSaveStore(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Storage adapter required');
  }
  const key = uid => {
    if (typeof uid !== 'string' || !uid.trim()) throw new TypeError('Authenticated UID required');
    return PREFIX + uid;
  };
  return {
    load(uid) {
      const raw = storage.getItem(key(uid));
      if (raw === null) return null;
      const save = JSON.parse(raw);
      if (!save || save.schemaVersion !== 1) throw new Error('Unsupported save version');
      return save;
    },
    save(uid, payload) {
      if (!payload || typeof payload !== 'object') throw new TypeError('Save payload required');
      const record = { schemaVersion: 1, payload };
      storage.setItem(key(uid), JSON.stringify(record));
      return record;
    },
  };
}
