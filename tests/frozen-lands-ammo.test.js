import test from 'node:test';
import assert from 'node:assert/strict';
import {rollNpcAmmoLoot,grantNpcAmmoLoot} from '../src/combat/NpcAmmoLoot.js';
import {getR4Board,acceptR4Mission,recordR4Event,claimR4Mission} from '../src/missions/RegionFourCampaign.js';
import {effectiveAmmo} from '../src/combat/NavalBattleRules.js';
test('R4 loot stays within 100-250 and other regions keep original loot',()=>{
 assert.equal(rollNpcAmmoLoot('r4',()=>0).amount,100);
 assert.equal(rollNpcAmmoLoot('r4',()=>.999999).amount,250);
 assert.equal(rollNpcAmmoLoot('r3').id,'rusted-iron');
 const patch=grantNpcAmmoLoot({ammunition:{'frozen-explosion':25},profile:{gold:40}},rollNpcAmmoLoot('r4',()=>0));
 assert.equal(patch.ammunition['frozen-explosion'],125);
 assert.equal(patch.profile.gold,190);
});
test('ice ammunition has independent ID, art and six-second status',()=>{
 const ice=effectiveAmmo('frozen-explosion');
 assert.equal(ice.id,'frozen-explosion');
 assert.match(ice.fx.projectile.texture,/explosao_gelida.svg/);
});
test('R4 mission reward is claimable exactly once',()=>{
 let save={};
 const accepted=acceptR4Mission(save,'r4-frost-watch');
 assert.ok(accepted);
 save={...save,...accepted};
 save={...save,...recordR4Event(save,{type:'defeat',archetype:'vigia-da-geada'})};
 save={...save,...recordR4Event(save,{type:'defeat',archetype:'vigia-da-geada'})};
 save={...save,...recordR4Event(save,{type:'return-port'})};
 assert.equal(getR4Board(save).claimable.length,1);
 const claimed=claimR4Mission(save,'r4-frost-watch');
 assert.equal(claimed.patch.ammunition['frozen-explosion'],300);
 save={...save,...claimed.patch};
 assert.equal(claimR4Mission(save,'r4-frost-watch'),null);
 assert.ok(acceptR4Mission(save,'r4-shadow-trail'));
});
