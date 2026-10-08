import test from 'node:test';
import assert from 'node:assert/strict';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';
import { NavalCombatWebGLRenderer } from '../src/rendering/NavalCombatWebGLRenderer.mjs';
import { effectiveAmmo, cannonHardpoint, interceptPoint } from '../src/combat/NavalBattleRules.js';

function battleHarness({ renderAccepted = true, mission = 'active', ammoCount = 20 } = {}) {
  let save = {
    missions: { corsair: mission },
    equipment: { loadout: { starter: ['blue-gold-pirate'] } },
    ammunition: { 'rusted-iron': ammoCount },
    combat: { shipHealth: 100 },
  };
  const enemy = {
    id: 'npc-1', type: 'npc', name: 'Corsário das Velas Rubras',
    archetype: 'red-sail-corsair',
    x: 320, y: 100, heading: 270, health: 25, maxHealth: 25, state: 'idle',
  };
  const player = { x: 100, y: 100, heading: 90 };
  const shots = [], messages = [], victories = [];
  let now = 1000;
  const renderer = {
    prepareAmmo() {},
    fire(shot) { if (!renderAccepted) return false; shots.push(shot); return true; },
    render() {},
    destroy() {},
  };
  const battle = new NavalBattleController({
    renderer, shipId: 'starter', readSave: () => save,
    writePatch: patch => { save = { ...save, ...patch }; },
    getPlayer: () => player,
    getEntities: () => new Map([[enemy.id, enemy]]),
    onFeedback: message => messages.push(message),
    onVictory: npc => victories.push(npc.id),
    random: () => .5, clock: () => now,
  });
  battle.setTarget(enemy.id);
  return {
    battle, renderer, player, enemy, shots, messages, victories,
    get save() { return save; },
    set time(value) { now = value; },
  };
}

test('mission and equipped cannon gate target acquisition', () => {
  const locked = battleHarness({ mission: 'complete' });
  assert.equal(locked.battle.getStatus().reason, 'mission');
  assert.equal(locked.battle.toggleFire(), false);
  assert.equal(locked.shots.length, 0);
  const empty = battleHarness({ ammoCount: 0 });
  assert.equal(empty.battle.getStatus().reason, 'ammo');
  assert.equal(empty.battle.toggleFire(), false);
  assert.equal(empty.shots.length, 0);
});

test('one cannon launches one flight, debits precisely one round and respects reload', () => {
  const t = battleHarness();
  assert.equal(t.battle.getStatus().ready, true);
  assert.equal(t.battle.toggleFire(), true);
  assert.equal(t.shots.length, 1);
  assert.equal(t.save.ammunition['rusted-iron'], 19);
  assert.equal(t.enemy.health, 25, 'damage must wait until the projectile arrives');
  t.time = 1500;
  t.battle.update(16, 1500);
  assert.equal(t.shots.length, 1, 'must respect cannon cooldown');
  t.time = 2300;
  t.battle.update(16, 2300);
  assert.equal(t.shots.length, 2);
  assert.equal(t.save.ammunition['rusted-iron'], 18);
  t.battle.toggleFire();
  t.time = 4000;
  t.battle.update(16, 4000);
  assert.equal(t.shots.length, 2, 'stop means stop creating new shots');
});

test('only a hull impact causes damage and allows NPC retaliation', () => {
  const t = battleHarness();
  t.battle.toggleFire();
  const shot = t.shots[0];
  assert.equal(shot.onImpact({ at: shot.to }).kind, 'ship');
  assert.equal(t.enemy.health, 15);
  assert.equal(t.enemy.state, 'retaliating');
  assert.match(t.messages.at(-1), /Acertou/);
});

test('a moving target causes a genuine splash instead of invisible damage', () => {
  const t = battleHarness();
  t.battle.toggleFire();
  t.enemy.x += 700;
  const shot = t.shots[0];
  assert.equal(shot.onImpact({ at: shot.to }).kind, 'water');
  assert.equal(t.enemy.health, 25);
});

test('a rejected WebGL shot never consumes ammunition', () => {
  const t = battleHarness({ renderAccepted: false });
  t.battle.toggleFire();
  assert.equal(t.shots.length, 0);
  assert.equal(t.save.ammunition['rusted-iron'], 20);
  assert.equal(t.battle.firing, false);
  assert.match(t.messages.at(-1), /preservada/);
});

test('the old combat renderer draws a flying cannonball and fires one impact callback', () => {
  const originalImage = globalThis.Image;
  try {
    let drawCalls = 0;
    const gl = new Proxy({
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      getParameter: () => [1, 256],
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      createTexture: () => ({}),
      drawArrays: () => { drawCalls++; },
    }, {
      get(obj, key) {
        if (key in obj) return obj[key];
        if (typeof key === 'string' && key.toUpperCase() === key) return key;
        return () => {};
      },
    });
    const canvas = {
      style: {}, width: 0, height: 0,
      getContext: name => name === 'webgl2' ? gl : null,
    };
    globalThis.Image = class {
      set src(value) { this.url = value; this.onload?.(); }
    };
    const renderer = new NavalCombatWebGLRenderer(canvas);
    assert.equal(renderer.init(), true);
    const ammo = effectiveAmmo('rusted-iron');
    let impacts = 0;
    assert.equal(renderer.fire({
      from: { x: 0, y: 0 }, to: { x: 200, y: 0 },
      ammo, duration: 800, startTime: 1000, impactKind: 'water',
      onImpact: () => { impacts++; return { kind: 'ship' }; },
    }), true);
    renderer.render({ time: 1300, camera: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 });
    assert.ok(drawCalls > 0, 'WebGL drawArrays must draw the traveling projectile');
    assert.equal(impacts, 0);
    renderer.render({ time: 1810, camera: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 });
    assert.equal(impacts, 1);
    assert.ok(renderer.impacts.some(impact => impact.kind === 'ship'));
    renderer.render({ time: 1850, camera: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 });
    assert.equal(impacts, 1, 'impact callback must never repeat');
    renderer.destroy();
  } finally {
    if (originalImage === undefined) delete globalThis.Image;
    else globalThis.Image = originalImage;
  }
});

test('projectile origin follows the equipped cannon side; interception accounts for velocity', () => {
  const right = cannonHardpoint({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0, 1);
  const left = cannonHardpoint({ x: 0, y: 0 }, { x: -100, y: 0 }, 0, 0, 1);
  assert.ok(right.x > 0 && left.x < 0);
  const predicted = interceptPoint({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 30, y: 0 }, 420);
  assert.ok(predicted.x > 200, 'must lead moving ship, not aim behind it');
});
