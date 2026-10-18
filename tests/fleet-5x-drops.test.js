import test from 'node:test';
import assert from 'node:assert/strict';
import { grantNpcAmmoLoot, rollNpcAmmoLoot } from '../src/combat/NpcAmmoLoot.js';
import { claimFleetMissionConsumables } from '../src/missions/FleetCampaign.js';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';

test('each defeated NPC grants exactly one 5X in addition to existing ammunition and gold',()=>{
 let save={consumables:{quantities:{'flame-5x':5,'speed-plus':3}},
  profile:{gold:100},ammunition:{'rusted-iron':8}};
 const loot=rollNpcAmmoLoot('r2');
 save={...save,...grantNpcAmmoLoot(save,loot)};
 assert.equal(save.consumables.quantities['flame-5x'],6);
 assert.equal(save.consumables.quantities['speed-plus'],3);
 assert.equal(save.ammunition['rusted-iron'],9);
 assert.equal(save.profile.gold,250);
});

function completedMissionSave(){
 return {fleetCampaign:{version:1,region:2,defeated:{r2:Array.from({length:20},(_,i)=>'npc'+i)},
  monsters:{r2:['m1','m2']},treasures:{r2:[]},preparedRegions:['r2'],
  bosses:{r2:[]}},consumables:{quantities:{'flame-5x':3,'speed-plus':1}}};
}
test('mission 1 and mission 2 each award 2 5X and 2 Veloz, only once',()=>{
 let save=completedMissionSave();
 assert.equal(claimFleetMissionConsumables({...save,fleetCampaign:{...save.fleetCampaign,preparedRegions:[]}},'r2',1),null);
 assert.equal(claimFleetMissionConsumables(save,'r2',2),null);
 save={...save,...claimFleetMissionConsumables(save,'r2',1)};
 assert.equal(save.consumables.quantities['flame-5x'],5);
 assert.equal(save.consumables.quantities['speed-plus'],3);
 assert.equal(claimFleetMissionConsumables(save,'r2',1),null);
 save={...save,fleetCampaign:{...save.fleetCampaign,bosses:{r2:['fugitive-frigate']}}};
 save={...save,...claimFleetMissionConsumables(save,'r2',2)};
 assert.equal(save.consumables.quantities['flame-5x'],7);
 assert.equal(save.consumables.quantities['speed-plus'],5);
 assert.equal(claimFleetMissionConsumables(save,'r2',2),null);
});

function combat({cannon,ammo,region='r2',targetBoss=false}){
 let save={fleetCampaign:{version:1},equipment:{loadout:{starter:[cannon]}},
  ammunition:{[ammo]:10},consumables:{selectedId:'flame-5x',quantities:{'flame-5x':2}},
  combat:{shipHealth:100},missions:{corsair:'active'}};
 const target={id:targetBoss?'r2-morbi':'npc',type:'npc',archetype:targetBoss?'golden-galleon':'fleet-raider',
  name:'NPC',x:200,y:100,health:100000,maxHealth:100000,heading:0};
 const shots=[];
 const battle=new NavalBattleController({shipId:'starter',
  renderer:{prepareAmmo(){},fire(shot){shots.push(shot);return true}},
  readSave:()=>save,writePatch:patch=>{save={...save,...patch}},
  getPlayer:()=>({x:100,y:100,heading:90}),getRegionId:()=>region,
  getEntities:()=>new Map([[target.id,target]]),clock:()=>1000,random:()=>.5});
 battle.setTarget(target.id);
 assert.equal(battle.activateConsumable().ok,true);
 assert.equal(battle.toggleFire(),true);
 assert.equal(shots.length,1);
 const before=target.health;
 shots[0].onImpact({at:{x:target.x,y:target.y}});
 return {battle,save,target,damage:before-target.health,shot:shots[0]};
}
test('5X only multiplies guided Aetherion damage, including ordinary NPC targets',()=>{
 const guided=combat({cannon:'aetherion-mk1',ammo:'aetherion-seeker'});
 const plain=combat({cannon:'royal-lion',ammo:'rusted-iron'});
 assert.equal(guided.shot.flameBoost,true);
 assert.equal(plain.shot.flameBoost,false);
 assert.ok(guided.damage>plain.damage*3.5,'guided damage is multiplied, ordinary cannon is not');
});
test('5X applies equally to guided shots against a boss without boosting non-guided guns',()=>{
 const guided=combat({cannon:'aetherion-mk1',ammo:'aetherion-seeker',targetBoss:true});
 const plain=combat({cannon:'royal-lion',ammo:'rusted-iron',targetBoss:true});
 assert.equal(guided.shot.flameBoost,true);
 assert.equal(plain.shot.flameBoost,false);
 assert.ok(guided.damage>plain.damage*3.5);
});


// Duration and cooldown are absolute saved timestamps. A reload cannot erase
// the 3-minute lock, and only guided Aetherion shots benefit during 30 seconds.
test('5X lasts 30 seconds, then remains on a 3-minute cooldown',()=>{
 const now=Date.now();
 let save={consumables:{selectedId:'flame-5x',quantities:{'flame-5x':3}}};
 const controller=new NavalBattleController({shipId:'starter',
  renderer:{prepareAmmo(){},fire(){return true}},
  readSave:()=>save,writePatch:patch=>{save={...save,...patch}},
  getPlayer:()=>({x:0,y:0,heading:0}),getEntities:()=>new Map()});
 const first=controller.activateConsumable();
 assert.equal(first.ok,true);
 assert.equal(save.consumables.quantities['flame-5x'],2);
 assert.ok(save.consumables.activeUntil>=now+30000 && save.consumables.activeUntil<=Date.now()+30000);
 assert.ok(save.consumables.cooldownUntil>=now+180000 && save.consumables.cooldownUntil<=Date.now()+180000);
 assert.equal(controller.activateConsumable().ok,false,'active effect cannot consume another unit');
 const reloaded=new NavalBattleController({shipId:'starter',renderer:{prepareAmmo(){},fire(){return true}},
  readSave:()=>save,writePatch:patch=>{save={...save,...patch}},
  getPlayer:()=>({x:0,y:0,heading:0}),getEntities:()=>new Map()});
 assert.equal(reloaded.getConsumables().cooldownUntil,save.consumables.cooldownUntil);
 const originalNow=Date.now;
 try{
  Date.now=()=>save.consumables.activeUntil+1;
  assert.equal(reloaded.isFlameActive(),false,'effect expires at 30 seconds');
  assert.equal(reloaded.activateConsumable().ok,false,'cannot restart while cooldown remains');
  assert.equal(save.consumables.quantities['flame-5x'],2);
  Date.now=()=>now+180001;
  assert.equal(reloaded.activateConsumable().ok,true,'5X can be used again after 180 seconds');
  assert.equal(save.consumables.quantities['flame-5x'],1);
 }finally{Date.now=originalNow;}
});