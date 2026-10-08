import test from 'node:test';
import assert from 'node:assert/strict';
import { FUGITIVE_FRIGATE_SHIP } from '../src/ships/FugitiveFrigateShip.js';
import { NPC_SHIP_CATALOG, SHIP_CATALOG, getShipFrame } from '../src/ships/ShipRegistry.js';
import {
  createFugitiveFrigate, updateFugitiveFrigate, createFugitiveFrigatePopulation,
  updateFugitiveFrigatePopulation, FUGITIVE_FRIGATE_NPC,
} from '../src/npcs/FugitiveFrigateNpc.js';

const region = { width: 3000, height: 3000, islands: [] };

test('fragata consta apenas no catalogo NPC e nao possui armamento', () => {
  assert.equal(FUGITIVE_FRIGATE_SHIP.playable, false);
  assert.equal(FUGITIVE_FRIGATE_SHIP.cannonSlots, 0);
  assert.equal(FUGITIVE_FRIGATE_SHIP.damage, 0);
  assert.equal(FUGITIVE_FRIGATE_SHIP.range, 0);
  assert.equal(FUGITIVE_FRIGATE_SHIP.acceleration, 420);
  assert.deepEqual(FUGITIVE_FRIGATE_SHIP.healthRange, { min: 120, max: 220 });
  assert.equal(NPC_SHIP_CATALOG.includes(FUGITIVE_FRIGATE_SHIP), true);
  assert.equal(SHIP_CATALOG.includes(FUGITIVE_FRIGATE_SHIP), false);
  assert.equal(FUGITIVE_FRIGATE_NPC.aggression, 'flee');
});

test('vida do NPC sorteada entre 120 e 220 e nunca ataca', () => {
  const low = createFugitiveFrigate('frig-1', 1000, 1000, 270, () => 0);
  const high = createFugitiveFrigate('frig-2', 1000, 1000, 270, () => .999999);
  assert.equal(low.health, 120);
  assert.equal(high.health, 220);
  assert.equal(low.cannonSlots, 0);
  assert.equal(low.aggression, 'flee');
  assert.equal(low.damage, 0);
  assert.equal(low.range, 0);
});

test('ao detectar jogador acelera e se afasta; depois desacelera', () => {
  const npc = createFugitiveFrigate('frig-3', 1000, 1000, 270, () => .5);
  const player = { x: 1230, y: 1000 };
  const initialX = npc.x;
  for (let i = 0; i < 20; i++) updateFugitiveFrigate(npc, player, region, 50, () => .5);
  assert.equal(npc.state, 'fleeing');
  assert.ok(npc.x < initialX, 'Navio deve navegar para longe do jogador');
  assert.ok(npc.speed > FUGITIVE_FRIGATE_SHIP.speed.initial);
  assert.ok(npc.speed <= FUGITIVE_FRIGATE_SHIP.speed.max);
  const atFullSpeed = npc.speed;
  const distantPlayer = { x: 2800, y: 2800 };
  for (let i = 0; i < 20; i++) updateFugitiveFrigate(npc, distantPlayer, region, 50, () => .5);
  assert.equal(npc.state, 'cruising');
  assert.ok(npc.speed < atFullSpeed);
});

test('populacao de fuga nasce longe do jogador e nunca cria duplicatas', () => {
  const world = { region, camera:{x: 1500, y: 1500}, entities:new Map() };
  assert.equal(createFugitiveFrigatePopulation(world, () => .10), true);
  assert.equal(createFugitiveFrigatePopulation(world, () => .10), false);
  assert.equal(world.entities.size, 1);
  const npc = [...world.entities.values()][0];
  assert.ok(Math.hypot(npc.x-world.camera.x,npc.y-world.camera.y) > 520);
  assert.equal(npc.health > 0, true);
  updateFugitiveFrigatePopulation(world, 16, () => .25);
  assert.equal(npc.aggression, 'flee');
});

test('Ladrao da Sombra tem quadros por direcao, com espelhamento apenas onde necessario', () => {
  const { sprite } = FUGITIVE_FRIGATE_SHIP;
  assert.equal(sprite.framesByHeading.length, 16);
  assert.equal(sprite.flipXByHeading.length, 16);
  assert.deepEqual(sprite.framesByHeading, [
    15, 13, 11, 10, 5, 3, 2, 1,
    0, 1, 2, 3, 5, 7, 9, 13,
  ]);
  for (let i = 0; i < 16; i++) {
    const heading = i * 22.5;
    assert.equal(getShipFrame(heading, FUGITIVE_FRIGATE_SHIP), sprite.framesByHeading[i],
      'rumo ' + heading);
    assert.ok(sprite.framesByHeading[i] >= 0 && sprite.framesByHeading[i] < 16);
    assert.equal(typeof sprite.flipXByHeading[i], 'boolean');
  }
  assert.equal(getShipFrame(0, FUGITIVE_FRIGATE_SHIP), 15, 'proa para cima');
  assert.equal(getShipFrame(90, FUGITIVE_FRIGATE_SHIP), 5, 'quadro de perfil espelhado para Leste');
  assert.equal(sprite.flipXByHeading[4], true);
  assert.equal(getShipFrame(180, FUGITIVE_FRIGATE_SHIP), 0, 'proa para baixo');
  assert.equal(getShipFrame(270, FUGITIVE_FRIGATE_SHIP), 5, 'perfil sem espelhamento para Oeste');
  assert.equal(sprite.flipXByHeading[12], false);
  assert.equal(getShipFrame(-90, FUGITIVE_FRIGATE_SHIP), 5);
  assert.equal(getShipFrame(360, FUGITIVE_FRIGATE_SHIP), 15);
});
