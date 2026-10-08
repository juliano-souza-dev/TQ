import test from 'node:test';
import assert from 'node:assert/strict';
import { GameLoop } from '../src/core/GameLoop.js';

function scheduler() {
  let id = 0;
  const pending = new Map();
  return {
    requestFrame(fn) { const next = ++id; pending.set(next, fn); return next; },
    cancelFrame(key) { pending.delete(key); },
    fire(time) {
      const next = pending.entries().next().value;
      if (!next) throw new Error('no pending frame');
      pending.delete(next[0]);
      next[1](time);
    },
    get count() { return pending.size; },
  };
}

test('fixed updates, interpolation and idempotent start', () => {
  const s = scheduler();
  const steps = [], alphas = [];
  const loop = new GameLoop({
    update: dt => steps.push(dt),
    render: alpha => alphas.push(alpha),
    requestFrame: s.requestFrame,
    cancelFrame: s.cancelFrame,
    now: () => 0,
    stepMs: 10,
    maxFrameMs: 50,
  });
  loop.start();
  loop.start();
  assert.equal(s.count, 1);
  s.fire(25);
  assert.deepEqual(steps, [10, 10]);
  assert.equal(alphas[0], 0.5);
  loop.stop();
  assert.equal(s.count, 0);
});

test('long pauses are clamped and stopping during update cancels next frame', () => {
  const s = scheduler();
  let updates = 0;
  const loop = new GameLoop({
    update: () => { updates++; loop.stop(); },
    requestFrame: s.requestFrame,
    cancelFrame: s.cancelFrame,
    now: () => 0,
    stepMs: 10,
    maxFrameMs: 30,
  });
  loop.start();
  s.fire(5000);
  assert.equal(updates, 1);
  assert.equal(s.count, 0);
});

test('restart discards stale accumulated time', () => {
  const s = scheduler();
  let count = 0;
  const loop = new GameLoop({
    update: () => count++,
    requestFrame: s.requestFrame,
    cancelFrame: s.cancelFrame,
    now: () => 100,
    stepMs: 10,
    maxFrameMs: 50,
  });
  loop.start();
  s.fire(105);
  loop.stop();
  loop.start();
  s.fire(105);
  assert.equal(count, 0);
});
