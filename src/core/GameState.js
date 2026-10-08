export const GAME_STATUS = Object.freeze({
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped',
});

export function createGameState({ seed = 1 } = {}) {
  if (!Number.isSafeInteger(seed)) throw new TypeError('seed must be a safe integer');
  return {
    schemaVersion: 1,
    status: GAME_STATUS.READY,
    tick: 0,
    elapsedMs: 0,
    seed,
    entities: {},
    events: [],
  };
}

export function advanceGameState(state, deltaMs) {
  if (!state || typeof state !== 'object') throw new TypeError('state is required');
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) throw new RangeError('deltaMs must be positive');
  if (state.status !== GAME_STATUS.RUNNING) return state;
  return { ...state, tick: state.tick + 1, elapsedMs: state.elapsedMs + deltaMs };
}

export function setGameStatus(state, status) {
  if (!Object.values(GAME_STATUS).includes(status)) throw new RangeError('invalid game status');
  return { ...state, status };
}
