import test from 'node:test';
import assert from 'node:assert/strict';
import { R1_MISSIONS, claimCampaignMission } from '../src/missions/RegionOneCampaign.js';
import { equipCannon, unequipCannon } from '../src/items/CannonLoadout.js';
import { STARTER_SHIP } from '../src/ships/StarterShip.js';

test('Caça ao Tesouro III concede exatamente três canhões reais dourados', () => {
  const mission = R1_MISSIONS.find(m => m.id === 'r1-treasure-iii');
  assert.equal(mission.reward.cannons['royal-lion'], 3);
  const save = {
    missions: { corsair:'complete' },
    equipment: { ownedCannonIds:[], cannonCounts:{} },
    campaign: {
      claimed: R1_MISSIONS.filter(m => !m.optional).slice(0,8).map(m => m.id),
      active:['r1-treasure-iii'],progress:{'r1-treasure-iii':[5]},
    },
  };
  const outcome = claimCampaignMission(save,'r1-treasure-iii');
  assert.ok(outcome);
  assert.equal(outcome.patch.equipment.cannonCounts['royal-lion'],3);
  assert.ok(outcome.patch.equipment.ownedCannonIds.includes('royal-lion'));
  assert.equal(claimCampaignMission({...save,...outcome.patch}, 'r1-treasure-iii'),null);
});
test('cada canhão possuído pode ocupar um slot sem apagar outro igual',()=>{
  let slots = {};
  const ship = STARTER_SHIP.id;
  const available=['royal-lion'];
  slots=equipCannon(slots,ship,0,'royal-lion',3,available,{'royal-lion':3});
  slots=equipCannon(slots,ship,1,'royal-lion',3,available,{'royal-lion':3});
  slots=equipCannon(slots,ship,2,'royal-lion',3,available,{'royal-lion':3});
  assert.deepEqual(slots[ship],['royal-lion','royal-lion','royal-lion']);
  const other = equipCannon(slots,'other',0,'royal-lion',1,available,{'royal-lion':3});
  assert.deepEqual(other.other,['royal-lion']);
  let twoOwned = {};
  twoOwned = equipCannon(twoOwned,ship,0,'royal-lion',3,available,{'royal-lion':2});
  twoOwned = equipCannon(twoOwned,ship,1,'royal-lion',3,available,{'royal-lion':2});
  assert.throws(()=>equipCannon(twoOwned,ship,2,'royal-lion',3,available,{'royal-lion':2}),/Not enough/);
  const reused = equipCannon(twoOwned,'other',0,'royal-lion',3,available,{'royal-lion':2});
  assert.equal(reused.other[0],'royal-lion');
  assert.equal(unequipCannon(slots,ship,1,3)[ship][1],null);
});
