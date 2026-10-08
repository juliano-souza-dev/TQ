import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, advanceGameState, setGameStatus, GAME_STATUS } from '../src/core/GameState.js';

test('initial state is deterministic and isolated', () => {
  const first = createGameState({ seed: 42 });
  const second = createGameState({ seed: 42 });
  assert.deepEqual(first, second);
  assert.notStrictEqual(first.entities, second.entities);
  assert.equal(first.status, GAME_STATUS.READY);
});

test('only running state advances without mutation', () => {
  const ready = createGameState();
  assert.strictEqual(advanceGameState(ready, 16), ready);
  const running = setGameStatus(ready, GAME_STATUS.RUNNING);
  const next = advanceGameState(running, 20);
  assert.equal(next.tick, 1);
  assert.equal(next.elapsedMs, 20);
  assert.equal(running.tick, 0);
});

test('invalid status and elapsed time are rejected', () => {
  assert.throws(() => setGameStatus(createGameState(), 'invalid'), RangeError);
  assert.throws(() => advanceGameState(createGameState(), 0), RangeError);
});
