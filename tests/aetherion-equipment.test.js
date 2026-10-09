import test from 'node:test';
import assert from 'node:assert/strict';
import { CANNONS, AMMUNITION } from '../src/items/EquipmentCatalog.js';
import { cannonAcceptsAmmo, shotDamage, effectiveAmmo } from '../src/combat/NavalBattleRules.js';
import { R2_MISSIONS, claimR2Mission } from '../src/missions/RegionTwoCampaign.js';

test('Aetherion preserves the 840-range cannon stats and accepts only guided ammunition', () => {
  const tech = CANNONS.find(c => c.id === 'aetherion-mk1');
  const base = CANNONS.find(c => c.id === 'royal-lion');
  for (const key of ['range','reloadSeconds','accuracy','damageMultiplier','caliberPounder']) {
    assert.equal(tech[key], base[key], key);
  }
  assert.ok(cannonAcceptsAmmo(tech,'aetherion-seeker'));
  assert.equal(cannonAcceptsAmmo(tech,'rusted-iron'),false);
  assert.equal(cannonAcceptsAmmo(base,'aetherion-seeker'),false);
  assert.equal(shotDamage(tech,'rusted-iron'),0);
  assert.ok(shotDamage(tech,'aetherion-seeker')>0);
});

test('seeker metadata locks same target for nine seconds and uses placeholder assets', () => {
  const ammo=AMMUNITION.find(item=>item.id==='aetherion-seeker');
  assert.equal(ammo.assetPending,true);
  assert.equal(ammo.tracking.maxDurationMs,9000);
  assert.equal(ammo.tracking.retarget,false);
  assert.equal(effectiveAmmo(ammo.id).trackingDurationMs,9000);
});

test('Preparar a Caçada rewards one cannon and fifty autoguided rounds', () => {
  const m=R2_MISSIONS.find(m=>m.id==='r2-equip-chaser');
  assert.deepEqual(m.reward.cannons,{'aetherion-mk1':1});
  assert.deepEqual(m.reward.ammo,{'aetherion-seeker':5000});
  const save={profile:{gold:0},ammunition:{},equipment:{},r2Campaign:{
    active:m.id,claimed:R2_MISSIONS.slice(0,9).map(m=>m.id),
    progress:{[m.id]:[1]},processed:[]
  }};
  const result=claimR2Mission(save,m.id);
  assert.ok(result);
  assert.equal(result.patch.equipment.cannonCounts['aetherion-mk1'],1);
  assert.equal(result.patch.ammunition['aetherion-seeker'],50);
});
