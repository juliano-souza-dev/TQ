import test from 'node:test';
import assert from 'node:assert/strict';
import { CORSAIR_POPULATION, createCorsairPopulation } from '../src/npcs/CorsairPopulation.js';
import { REGION_ONE_TREASURES, ALL_R1_TREASURES, getVisibleTreasures } from '../src/treasures/RegionTreasures.js';
import { R1 } from '../src/world/regions/r1.js';
import { createWorldState } from '../src/world/WorldState.js';
import { collidesWithIsland } from '../src/world/IslandCollision.js';

test('R1 contains 72 unique treasure spawn points outside island collisions', () => {
  assert.equal(REGION_ONE_TREASURES.length, 24);
  assert.equal(ALL_R1_TREASURES.length, 72);
  assert.equal(new Set(ALL_R1_TREASURES.map(t => t.id)).size, 72);
  for (const treasure of ALL_R1_TREASURES) {
    assert.ok(treasure.x > 0 && treasure.x < R1.width);
    assert.ok(treasure.y > 0 && treasure.y < R1.height);
    assert.equal(collidesWithIsland(R1, treasure.x, treasure.y, 65), false, treasure.id);
  }
  assert.equal(getVisibleTreasures().length, 72);
});

test('corsair population doubles to 20 without duplicate IDs', () => {
  assert.equal(CORSAIR_POPULATION, 20);
  const world = createWorldState(R1);
  createCorsairPopulation(world, Math.random);
  assert.equal(world.entities.size, 20);
  assert.equal(new Set(world.entities.keys()).size, 20);
});
