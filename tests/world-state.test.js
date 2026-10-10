import test from 'node:test';
import assert from 'node:assert/strict';
import { R1 } from '../src/world/regions/r1.js';
import { createWorldState } from '../src/world/WorldState.js';

test('R1 has valid dimensions, ocean color and spawn', () => {
  assert.equal(R1.id, 'r1');
  assert.match(R1.oceanColor, /^#[0-9a-f]{6}$/i);
  assert.ok(R1.spawn.x >= 0 && R1.spawn.x <= R1.width);
  assert.ok(R1.spawn.y >= 0 && R1.spawn.y <= R1.height);
});

test('new world is empty and independently instantiated', () => {
  const first = createWorldState();
  const second = createWorldState();
  assert.equal(first.entities.size, 0);
  assert.equal(first.region, R1);
  first.entities.set('test', {});
  assert.equal(second.entities.size, 0);
});

test('invalid region is rejected', () => {
  assert.throws(() => createWorldState({ width: 0, height: 10 }), TypeError);
});


test('ilha decorativa não bloqueia o oceano se o asset falhar', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/IslandRenderer.js', import.meta.url), 'utf8'));
  assert.match(source, /island\.kind === 'decoration'/);
  assert.match(source, /Ilha decorativa ignorada/);
  assert.match(source, /throw new Error\('Falha ao carregar ilha: ' \+ island\.id/);
});
