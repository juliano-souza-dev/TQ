import test from 'node:test';
import assert from 'node:assert/strict';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';
import { rollNpcAmmoLoot,grantNpcAmmoLoot } from '../src/combat/NpcAmmoLoot.js';
import { treasureReward,claimTreasure,getVisibleTreasures } from '../src/treasures/RegionTreasures.js';
import { recordFleetTreasure,claimFleetMissionConsumables } from '../src/missions/FleetCampaign.js';

function battle({cannon='royal-lion',ammo='rusted-iron',accepted=true,enabled=false,charges=3}={}){
 let save={fleetCampaign:{version:1},missions:{corsair:'active'},
   equipment:{loadout:{starter:[cannon]}},ammunition:{[ammo]:20},
   consumables:{selectedId:'double-damage',quantities:{'double-damage':charges},doubleDamageEnabled:enabled},
   combat:{shipHealth:100}};
 const npc={id:'raider-1',name:'Raider',type:'npc',archetype:'fleet-raider',
  x:200,y:100,heading:0,health:100000,maxHealth:100000};
 const shots=[];
 const c=new NavalBattleController({shipId:'starter',
  renderer:{prepareAmmo(){},fire(shot){if(!accepted)return false;shots.push(shot);return true}},
  readSave:()=>save,writePatch:p=>{save={...save,...p}},
  getRegionId:()=> 'r2',getPlayer:()=>({x:100,y:100,heading:90}),
  getEntities:()=>new Map([[npc.id,npc]]),random:()=>.5,clock:()=>1000});
 c.setTarget(npc.id);
 return {c,npc,shots,get save(){return save}};
}
test('2X toggles on/off without consuming charges; 1 charge per accepted shot',()=>{
 const t=battle();
 assert.equal(t.c.activateConsumable().ok,true);
 assert.equal(t.save.consumables.quantities['double-damage'],3);
 assert.equal(t.c.toggleFire(),true);
 assert.equal(t.save.consumables.quantities['double-damage'],2);
 assert.equal(t.c.activateConsumable().ok,true);
 assert.equal(t.save.consumables.doubleDamageEnabled,false);
 assert.equal(t.save.consumables.quantities['double-damage'],2);
});
test('ordinary cannon projectiles deal exactly 2X while enabled',()=>{
 const normal=battle(),boosted=battle({enabled:true});
 normal.c.toggleFire();boosted.c.toggleFire();
 const beforeNormal=normal.npc.health,beforeBoosted=boosted.npc.health;
 normal.shots[0].onImpact({at:{x:normal.npc.x,y:normal.npc.y}});
 boosted.shots[0].onImpact({at:{x:boosted.npc.x,y:boosted.npc.y}});
 assert.equal((beforeBoosted-boosted.npc.health),2*(beforeNormal-normal.npc.health));
 assert.equal(normal.save.consumables.quantities['double-damage'],3);
 assert.equal(boosted.save.consumables.quantities['double-damage'],2);
});
test('2X costs nothing for WebGL rejected launches and deactivates at zero charges',()=>{
 const rejected=battle({accepted:false,enabled:true});
 assert.equal(rejected.c.toggleFire(),false);
 assert.equal(rejected.save.consumables.quantities['double-damage'],3);
 const exhausted=battle({enabled:true,charges:1});
 assert.equal(exhausted.c.toggleFire(),true);
 assert.equal(exhausted.save.consumables.quantities['double-damage'],0);
 assert.equal(exhausted.save.consumables.doubleDamageEnabled,false);
 assert.equal(exhausted.c.activateConsumable().ok,false);
});
test('NPC sinking drop rolls from 200 to 500 inclusive and retains 5X',()=>{
 for(const fraction of [0,.5,.999999]){
  const loot=rollNpcAmmoLoot('r2',()=>fraction);
  assert.ok(loot.doubleDamage>=200&&loot.doubleDamage<=500);
  const patch=grantNpcAmmoLoot({consumables:{quantities:{'double-damage':9}}},loot);
  assert.equal(patch.consumables.quantities['double-damage'],9+loot.doubleDamage);
  assert.equal(patch.consumables.quantities['flame-5x'],1);
 }
 assert.equal(rollNpcAmmoLoot('r1',()=>0).doubleDamage,200);
 assert.equal(rollNpcAmmoLoot('r1',()=>.999999).doubleDamage,500);
});
test('normal and fleet treasure grant 200-500 2X and 1-5 5X once',()=>{
 const old={};
 const item=getVisibleTreasures(old,Date.now(),'r1')[0];
 assert.ok(item);
 const outcome=claimTreasure(old,item.id);
 assert.ok(outcome);
 assert.equal(outcome.patch.consumables.quantities['double-damage'],outcome.reward.doubleDamage);
 assert.equal(outcome.patch.consumables.quantities['flame-5x'],outcome.reward.flame5x);
 assert.equal(claimTreasure({...old,...outcome.patch},item.id),null);
 const save={fleetCampaign:{version:1,region:2,treasures:{}}};
 const fid='fleet-r2-'+getVisibleTreasures({},0,'r2')[0].id;
 const reward=treasureReward(fid);
 const patch=recordFleetTreasure(save,'r2',fid);
 assert.equal(patch.consumables.quantities['double-damage'],reward.doubleDamage);
 assert.equal(patch.consumables.quantities['flame-5x'],reward.flame5x);
 assert.ok(reward.doubleDamage>=200&&reward.doubleDamage<=500);
 assert.ok(reward.flame5x>=1&&reward.flame5x<=5);
 assert.equal(recordFleetTreasure({...save,...patch},'r2',fid),null);
});
test('fleet missions grant 1000 2X independently of previous consumable claims',()=>{
 let save={fleetCampaign:{version:1,region:2,
  preparedRegions:['r2'],treasureGoal:{r2:0},
  defeated:{r2:Array.from({length:20},(_,i)=>'npc'+i)},monsters:{r2:['m1','m2']},
  claimedMissionConsumables:['r2:1']},consumables:{quantities:{'flame-5x':6,'speed-plus':3}}};
 const patch=claimFleetMissionConsumables(save,'r2',1);
 assert.ok(patch);
 assert.equal(patch.consumables.quantities['double-damage'],1000);
 assert.equal(patch.consumables.quantities['flame-5x'],6);
 assert.equal(patch.consumables.quantities['speed-plus'],3);
 save={...save,...patch};
 assert.equal(claimFleetMissionConsumables(save,'r2',1),null);
});
