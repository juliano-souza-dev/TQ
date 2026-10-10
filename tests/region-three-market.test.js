import test from 'node:test';
import assert from 'node:assert/strict';
import { R2 } from '../src/world/regions/r2.js';
import { R3 } from '../src/world/regions/r3.js';
import { createWorldState } from '../src/world/WorldState.js';
import {
  createCorsairPopulation, updateCorsairPopulation, CORSAIR_POPULATION,
} from '../src/npcs/CorsairPopulation.js';
import { collidesWithIsland } from '../src/world/IslandCollision.js';
import { BLOOD_RED_MARKET_MERCHANT } from '../src/npcs/BloodRedCorsairNpc.js';
import { AMMUNITION, isItemVisible } from '../src/items/EquipmentCatalog.js';
import { createMonsterPopulation } from '../src/monsters/MonsterPopulation.js';
import { normalizeOceanConfig } from '../src/world/WorldOceanEffect.mjs';
import {
  DARK_WATERS_RAIDER_ARCHETYPE,
  DARK_WATERS_SPECIAL_AMMO_ID,
  DARK_WATERS_SPECIAL_AMMO_REWARD,
} from '../src/npcs/DarkWatersFleet.js';

test('Silas Rubro continua exclusivo das Águas Escuras', () => {
  const worldR2 = createWorldState(R2);
  createCorsairPopulation(worldR2, () => .42);
  assert.equal(worldR2.entities.size, CORSAIR_POPULATION);
  assert.equal(worldR2.entities.has('r3-mercador-do-breu'), false);

  const worldR3 = createWorldState(R3);
  createCorsairPopulation(worldR3, () => .42);

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

test('Mapa 3 nasce com o chefe e exatamente dois ladrões do terror', () => {
  const world = createWorldState(R3);
  createCorsairPopulation(world, () => .42);

  assert.equal(world.entities.size, 5);
  assert.equal([...world.entities.values()].some(n => n.archetype === 'red-sail-corsair'), false);

  const boss = world.entities.get('r3-terror-do-mar');
  assert.ok(boss);
  assert.equal(boss.shipId, 'terror-do-mar');
  assert.equal(boss.name, 'Terror do Mar · Capitão Varkor Tenebris');
  assert.equal(boss.captainName, 'Capitão Varkor Tenebris');
  assert.equal(boss.maxHealth, 500000);
  assert.equal(boss.cannonSlots, 10);
  assert.equal(collidesWithIsland(R3, boss.x, boss.y, 75), false);

  const raiders = [...world.entities.values()].filter(n => n.archetype === DARK_WATERS_RAIDER_ARCHETYPE);
  assert.equal(raiders.length, 2);
  assert.deepEqual(raiders.map(n => n.name).sort(), ['Dente do Pavor', 'Sombra do Saque']);
  for (const raider of raiders) {
    assert.equal(raider.shipId, 'corsario-vermelho-sangue');
    assert.equal(raider.rewardAmmoId, DARK_WATERS_SPECIAL_AMMO_ID);
    assert.equal(raider.rewardAmmoAmount, DARK_WATERS_SPECIAL_AMMO_REWARD);
    assert.ok(raider.baseSpeed >= 500);
    assert.equal(collidesWithIsland(R3, raider.x, raider.y, 75), false);
  }
});

test('ladrão gera evento de saque ao cruzar o jogador e respawna após ser afundado', () => {
  const world = createWorldState(R3);
  createCorsairPopulation(world, () => .42);
  const raider = world.entities.get('r3-sombra-do-saque');

  world.camera.x = raider.x;
  world.camera.y = raider.y;
  const raids = updateCorsairPopulation(world, 0, () => .42);
  assert.equal(raids.length, 1);
  assert.equal(raids[0].id, raider.id);
  assert.equal(raider.stolenThisPass, true);

  raider.health = 0;
  updateCorsairPopulation(world, 30001, () => .42);
  assert.equal(raider.health, raider.maxHealth);
  assert.equal(raider.stolenThisPass, false);
});


test('Rosa do Terror permanece disponível fora de qualquer evento sazonal', () => {
  const ammo = AMMUNITION.find(item => item.id === DARK_WATERS_SPECIAL_AMMO_ID);
  assert.ok(ammo);
  assert.equal(ammo.name, 'Rosa do Terror');
  assert.equal(ammo.event, null);
  assert.equal(ammo.acquisition.region, 'r3');
  assert.equal(isItemVisible(ammo, { halloween: false }), true);
});


test('Águas Escuras não recebe Krakens genéricos enquanto o conceito naval está sendo definido', () => {
  const world = createWorldState(R3);
  createCorsairPopulation(world, () => .42);
  const before = world.entities.size;
  assert.equal(createMonsterPopulation(world, () => .42), 0);
  assert.equal(world.entities.size, before);
  assert.equal([...world.entities.values()].some(entity => entity.type === 'monster'), false);
});


test('oceano da R3 é mais verde, escuro e contaminado que o mapa anterior', () => {
  const ocean = normalizeOceanConfig(R3.ocean);
  const previous = normalizeOceanConfig(R2.ocean);
  assert.equal(ocean.corruption.active, true);
  assert.equal(ocean.corruption.zones.length, 4);
  assert.ok(ocean.tintG > ocean.tintR);
  assert.ok(ocean.tintG > ocean.tintB);
  assert.ok(ocean.swell > previous.swell);
  assert.ok(ocean.sparkleIntensity < previous.sparkleIntensity);
  assert.equal(ocean.corruption.zones[0].x, R3.terrorBoss.x);
  assert.equal(ocean.corruption.zones[0].y, R3.terrorBoss.y);
  assert.equal(ocean.corruption.zones[0].intensity, 1);
});


test('Fantasma Esmeralda entra na R3 com efeito espectral WebGL habilitado', async () => {
  const { EMERALD_GHOST_SHIP } = await import('../src/ships/EmeraldGhostShip.js');
  const world = createWorldState(R3);
  createCorsairPopulation(world, () => .42);
  const ghost = world.entities.get('r3-fantasma-esmeralda');
  assert.ok(ghost);
  assert.equal(ghost.name, 'Fantasma Esmeralda');
  assert.equal(ghost.shipId, EMERALD_GHOST_SHIP.id);
  assert.equal(ghost.archetype, 'emerald-ghost');
  assert.equal(ghost.spectral, true);
  assert.equal(ghost.attackProtectedUntil, Infinity);
  assert.equal(EMERALD_GHOST_SHIP.sprite.path, '../../assets/ships/verde_fantasma.webp');
  assert.equal(EMERALD_GHOST_SHIP.sprite.frameCount, 16);
  assert.equal(EMERALD_GHOST_SHIP.spectralEffect.enabled, true);
  assert.ok(EMERALD_GHOST_SHIP.spectralEffect.haloIntensity > .8);
  assert.equal(collidesWithIsland(R3, ghost.x, ghost.y, 75), false);
});
