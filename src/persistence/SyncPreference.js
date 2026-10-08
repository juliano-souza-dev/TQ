export const SYNC_MODE = Object.freeze({ LOCAL: 'local', CLOUD: 'cloud' });
const PREFIX = 'tq:sync-mode:v1:';

export function createSyncPreferenceStore(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    throw new TypeError('Storage adapter required');
  }
  const key = uid => {
    if (typeof uid !== 'string' || !uid.trim()) throw new TypeError('Authenticated UID required');
    return PREFIX + uid;
  };
  return {
    get(uid) {
      const value = storage.getItem(key(uid));
      return value === SYNC_MODE.LOCAL || value === SYNC_MODE.CLOUD ? value : null;
    },
    set(uid, mode) {
      if (!Object.values(SYNC_MODE).includes(mode)) throw new RangeError('Invalid sync mode');
      storage.setItem(key(uid), mode);
      return mode;
    },
  };
}
