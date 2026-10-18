import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAmmoFx,compactShipImpactFx,SHIP_HIT_VISUAL_LIMITS} from '../src/combat/fx/AmmoFxProfile.mjs';
import {NavalCombatWebGLRenderer} from '../src/rendering/NavalCombatWebGLRenderer.mjs';
import {effectiveAmmo} from '../src/combat/NavalBattleRules.js';

test('all standard and special ammunition gets compact, non-obscuring ship impacts',()=>{
  for(const ammoId of ['rusted-iron','aetherion-seeker','glacial-seeker',
    'frozen-explosion','moon-barrage','violet-crystal','volcanic-lava',
    'purple-pumpkin-orb','ocean-pearl','terror-rose']){
    const ammo=effectiveAmmo(ammoId);
    assert.ok(ammo,ammoId+' exists');
    const original=normalizeAmmoFx(ammo);
    const ship=compactShipImpactFx(original.impactShip);
    assert.ok(ship.size<=SHIP_HIT_VISUAL_LIMITS.maxSize,ammoId+' must not obscure the ship');
    assert.ok(ship.size<original.impactShip.size,ammoId+' is visibly smaller');
    assert.ok(ship.durationMs<=SHIP_HIT_VISUAL_LIMITS.maxDurationMs);
    assert.ok(ship.sparks<=SHIP_HIT_VISUAL_LIMITS.maxSparks);
    assert.ok(ship.ringCount<=SHIP_HIT_VISUAL_LIMITS.maxRings);
    assert.ok(ship.flash<=SHIP_HIT_VISUAL_LIMITS.maxFlash);
    assert.ok(ship.fireworks<=SHIP_HIT_VISUAL_LIMITS.maxFireworks);
    assert.equal(normalizeAmmoFx(ammo).impactShip.size,original.impactShip.size,
      'render-only reduction must not mutate the catalog');
  }
});

test('immediate WebGL impact scales down ship hits, but not splashes or monster blood',()=>{
  const renderer=Object.create(NavalCombatWebGLRenderer.prototype);
  renderer.init=()=>true;
  renderer.impacts=[];
  renderer.reducedFx=false;
  const ammo=effectiveAmmo('frozen-explosion');
  const baseline=normalizeAmmoFx(ammo);
  assert.equal(renderer.impact({at:{x:200,y:350},ammo,kind:'ship',startTime:300}),true);
  const ship=renderer.impacts.at(-1);
  assert.equal(ship.kind,'ship');
  assert.ok(ship.fx.impactShip.size<baseline.impactShip.size);
  assert.ok(ship.duration<=440);
  assert.deepEqual(ship.fx.impactWater,baseline.impactWater,'water effects stay unchanged');
  assert.equal(renderer.impact({at:{x:200,y:350},ammo,kind:'water',startTime:500}),true);
  const water=renderer.impacts.at(-1);
  assert.deepEqual(water.fx.impactWater,baseline.impactWater);
  assert.equal(water.fx.impactShip.size,baseline.impactShip.size,
    'water hits do not alter the supplied ammunition profile');
  assert.equal(renderer.impact({at:{x:200,y:350},ammo,kind:'monster',startTime:600}),true);
  const monster=renderer.impacts.at(-1);
  assert.equal(monster.fx.impactShip.size,baseline.impactShip.size,
    'monster blood sizing is not altered');
});
