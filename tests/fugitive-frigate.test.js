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

test('Ladrao da Sombra usa 16 direcoes exatas sem espelhamento', () => {
  const { sprite } = FUGITIVE_FRIGATE_SHIP;
  const expected = [4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3];
  assert.deepEqual(sprite.framesByHeading, expected);
  assert.deepEqual(sprite.flipXByHeading, Array(16).fill(false));
  for (let i = 0; i < 16; i++) {
    assert.equal(getShipFrame(i * 22.5, FUGITIVE_FRIGATE_SHIP), expected[i]);
  }
  assert.equal(getShipFrame(0, FUGITIVE_FRIGATE_SHIP), 4);
  assert.equal(getShipFrame(90, FUGITIVE_FRIGATE_SHIP), 8);
  assert.equal(getShipFrame(180, FUGITIVE_FRIGATE_SHIP), 12);
  assert.equal(getShipFrame(270, FUGITIVE_FRIGATE_SHIP), 0);
  assert.equal(getShipFrame(360, FUGITIVE_FRIGATE_SHIP), 4);
});

test('fragata ladra também patrulha a R2 com ID próprio e movimento contínuo', () => {
  const world = {region:{...region,id:'r2'},camera:{x:1500,y:1500},entities:new Map()};
  assert.equal(createFugitiveFrigatePopulation(world,()=>.10),true);
  const frigate=world.entities.get('fugitive-frigate-r2-01');
  assert.ok(frigate);
  assert.equal(frigate.archetype,FUGITIVE_FRIGATE_NPC.id);
  const original={x:frigate.x,y:frigate.y};
  updateFugitiveFrigatePopulation(world,1000,()=>.5);
  assert.ok(Math.hypot(frigate.x-original.x,frigate.y-original.y)>0);
  assert.equal(createFugitiveFrigatePopulation(world,()=>.10),false);
});
