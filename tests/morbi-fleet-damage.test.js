import test from 'node:test';
import assert from 'node:assert/strict';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';

function fireAtMorbi({ fleet = false } = {}) {
  let save = {
    equipment: { loadout: { starter: ['royal-lion'] } },
    ammunition: { 'rusted-iron': 50 },
    combat: { shipHealth: 100 },
    ...(fleet ? { fleetCampaign: { version: 1 } }
      : { r2Campaign: { active: 'r2-golden-ii' } }),
  };
  const morbi = {
    id: 'r2-morbi', name: 'Morbi · Galeão Dourado',
    archetype: 'golden-galleon', type: 'npc',
    x: 300, y: 100, heading: 0,
    health: fleet ? 20000 : 900000,
    maxHealth: fleet ? 20000 : 900000,
    state: 'retaliating', aggression: 'attack',
  };
  const before = morbi.health;
  const shots = [];
  const battle = new NavalBattleController({
    renderer: {
      prepareAmmo() {},
      fire(shot) { shots.push(shot); return true; },
    },
    shipId: 'starter',
    getRegionId: () => 'r2',
    getPlayer: () => ({ x: 100, y: 100, heading: 90 }),
    getEntities: () => new Map([[morbi.id, morbi]]),
    readSave: () => save,
    writePatch: patch => { save = { ...save, ...patch }; },
    random: () => .5,
    clock: () => 1000,
  });
  battle.setTarget(morbi.id);
  assert.equal(battle.toggleFire(), true);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].onImpact({ at: { x: morbi.x, y: morbi.y } }).kind, 'ship');
  return { before, after: morbi.health };
}

test('fleet campaign: Morbi survives cannon strikes rather than receiving legacy 2500x damage', () => {
  const { before, after } = fireAtMorbi({ fleet: true });
  assert.ok(before - after > 0, 'a hit must cause damage');
  assert.ok(before - after < 500, 'fleet damage must not inherit the legacy 2500x bonus');
  assert.ok(after > before * .9, 'one cannonball must not nearly sink the fleet boss');
});

test('legacy Galeão Dourado II encounter keeps its intended 2500x damage scaling', () => {
  const { before, after } = fireAtMorbi();
  assert.ok(before - after >= 100000, 'the old 900k HP battle keeps its special multiplier');
  assert.ok(after > 0, 'the original Morbi duel still survives a shot');
});
