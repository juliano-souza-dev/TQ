import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectile, projectilePosition, advanceProjectiles } from '../src/combat/Projectiles.js';
import { NavalProjectileRenderer } from '../src/rendering/NavalProjectileRenderer.js';

test('projectile travels through a real ballistic arc', () => {
  const shot = createProjectile({
    from: { x: 0, y: 0 }, to: { x: 180, y: 0 },
    owner: 'player', targetId: 'corsair', damage: 10,
    accuracy: 1, random: () => 0.5,
  });
  assert.deepEqual(projectilePosition(shot, 0), { x: 0, y: 0, height: 0 });
  const midpoint = projectilePosition(shot, 0.5);
  assert.ok(midpoint.x > 0 && midpoint.x < 180);
  assert.ok(midpoint.height > 0);
  assert.ok(Math.abs(projectilePosition(shot, 1).x - 180) < 1e-8);
  assert.ok(Math.abs(projectilePosition(shot, 1).height) < 1e-8);
});

test('the impact is calculated from collision, not a pre-rolled hit', () => {
  const target = { x: 200, y: 0, health: 25 };
  let shots = [createProjectile({
    from: { x: 0, y: 0 }, to: { x: 200, y: 0 },
    owner: 'player', targetId: 'corsair', damage: 10,
    speed: 200, accuracy: .25, random: () => .5,
  })];
  const impacts = [];
  for (let i = 0; i < 150 && shots.length; i++) {
    shots = advanceProjectiles(shots, 1000 / 60,
      (shot, impact) => impacts.push(impact), () => target);
  }
  assert.equal(shots.length, 0);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].kind, 'hit');
});

test('a failed trajectory produces water splash, not ship damage', () => {
  const target = { x: 200, y: 0, health: 25 };
  let shots = [createProjectile({
    from: { x: 0, y: 0 }, to: { x: 200, y: 0 },
    owner: 'player', targetId: 'corsair', damage: 10,
    speed: 200, accuracy: .25, random: () => 0,
  })];
  const impacts = [];
  for (let i = 0; i < 200 && shots.length; i++) {
    shots = advanceProjectiles(shots, 1000 / 60,
      (shot, impact) => impacts.push(impact), () => target);
  }
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].kind, 'splash');
});

test('world renderer draws a cannonball image and its visible trajectory on NPC canvas', () => {
  const previousImage = globalThis.Image;
  const previousWindow = globalThis.window;
  try {
    globalThis.window = { devicePixelRatio: 1 };
    globalThis.Image = class {
      naturalWidth = 32;
      set src(url) { this.url = url; this.onload?.(); }
    };
    const calls = [];
    const context = new Proxy({}, {
      set(obj, key, value) { obj[key] = value; return true; },
      get(obj, key) {
        if (key in obj) return obj[key];
        return (...args) => calls.push({ method: key, args });
      },
    });
    const canvas = {
      width: 800, height: 600,
      getContext: () => context,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    };
    const renderer = new NavalProjectileRenderer(canvas);
    const shot = createProjectile({
      from: { x: 0, y: 0 }, to: { x: 200, y: 0 },
      owner: 'player', targetId: 'corsair',
      speed: 200, accuracy: 1,
    });
    shot.elapsed = shot.duration / 2;
    renderer.render([shot], [{ x: 200, y: 0, kind: 'hit', elapsed: 0, duration: .5 }],
      { x: 0, y: 0 }, 1);
    assert.ok(calls.some(call => call.method === 'drawImage'), 'Real ammunition sprite should be painted');
    assert.ok(calls.some(call => call.method === 'stroke'), 'Flight trail should be painted');
    assert.ok(calls.some(call => call.method === 'arc'), 'Cannonball and impact should be painted');
  } finally {
    if (previousImage === undefined) delete globalThis.Image;
    else globalThis.Image = previousImage;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
