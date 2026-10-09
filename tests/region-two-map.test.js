import test from 'node:test';
import assert from 'node:assert/strict';
import { R1 } from '../src/world/regions/r1.js';
import { R2 } from '../src/world/regions/r2.js';
import { createWorldState } from '../src/world/WorldState.js';
import { createCorsairPopulation } from '../src/npcs/CorsairPopulation.js';
import { collidesWithIsland } from '../src/world/IslandCollision.js';

test('Costa dos Corsários tem exatamente 25% mais área, dois portos e duas ilhas decorativas', () => {
  assert.equal(R2.width * R2.height, R1.width * R1.height * 1.25);
  assert.equal(R2.islands.length, 4);
  assert.deepEqual(R2.islands.map(i=>i.kind).sort(), ['decoration','decoration','missions','shipyard']);
  assert.equal(collidesWithIsland(R2, R2.spawn.x, R2.spawn.y, 32), false);
  for (const kind of ['missions','shipyard']) {
    assert.equal(R2.islands.find(i=>i.kind===kind).asset, R1.islands.find(i=>i.kind===kind).asset);
  }
  assert.equal(R2.islands.filter(i=>i.kind==='decoration').every(i=>Boolean(i.asset)),true);
});

test('Corsário Rosas de Ouro não aparece na região 2', () => {
  const world = createWorldState(R2);
  createCorsairPopulation(world,()=>.42);
  assert.equal([...world.entities.values()].some(n=>n.archetype==='rose-gold-corsair'),false);
});
