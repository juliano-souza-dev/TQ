import test from 'node:test';
import assert from 'node:assert/strict';
import { R2 } from '../src/world/regions/r2.js';
import { R3 } from '../src/world/regions/r3.js';
import { createWorldState } from '../src/world/WorldState.js';
import { createCorsairPopulation, CORSAIR_POPULATION } from '../src/npcs/CorsairPopulation.js';
import { collidesWithIsland } from '../src/world/IslandCollision.js';
import { BLOOD_RED_MARKET_MERCHANT } from '../src/npcs/BloodRedCorsairNpc.js';

test('Silas Rubro existe somente nas Águas Escuras', () => {
  const worldR2 = createWorldState(R2);
  createCorsairPopulation(worldR2, () => .42);
  assert.equal(worldR2.entities.size, CORSAIR_POPULATION);
  assert.equal(worldR2.entities.has('r3-mercador-do-breu'), false);

  const worldR3 = createWorldState(R3);
  createCorsairPopulation(worldR3, () => .42);
  assert.equal(worldR3.entities.size, CORSAIR_POPULATION + 1);

  const merchant = worldR3.entities.get('r3-mercador-do-breu');
  assert.ok(merchant);
  assert.equal(merchant.name, 'Silas Rubro, o Mercador do Breu');
  assert.equal(merchant.shipId, 'corsario-vermelho-sangue');
  assert.equal(merchant.archetype, BLOOD_RED_MARKET_MERCHANT.id);
  assert.equal(merchant.merchantKind, 'black-market');
  assert.deepEqual(merchant.tradeCategories, ['cannons', 'ammunition']);
  assert.equal(merchant.attackProtectedUntil, Infinity);
  assert.equal(collidesWithIsland(R3, merchant.x, merchant.y, 75), false);
});
