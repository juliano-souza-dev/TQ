import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HARPOON_LAUNCHERS,HORIZON_HARPOON_ID,equippedHarpoon,harpoonDamage
} from '../src/combat/HarpoonCatalog.js';
import {
  R3_MISSIONS,claimR3Mission,grantR3HorizonHarpoon
} from '../src/missions/RegionThreeCampaign.js';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';

const claimedSave=()=>({
  r3Campaign:{active:'r3-dark-waters-warning',wreckDelivered:true,claimed:['r3-equip-golden'],wreckDiaries:['r3-wreck-1','r3-wreck-2','r3-wreck-3']},
  profile:{gold:250},
  equipment:{
    ownedHarpoonIds:['naval-harpoon-starter','harpoon-armor-breaker-launcher'],
    equippedHarpoonId:'harpoon-armor-breaker-launcher',
    ownedShipIds:['my-ship'],loadout:{'my-ship':[]}
  },
});

test('Horizon launcher preserves both original launchers and has approved statistics',()=>{
  const starter=HARPOON_LAUNCHERS.find(h=>h.id==='naval-harpoon-starter');
  const breaker=HARPOON_LAUNCHERS.find(h=>h.id==='harpoon-armor-breaker-launcher');
  const horizon=HARPOON_LAUNCHERS.find(h=>h.id===HORIZON_HARPOON_ID);
  assert.equal(HARPOON_LAUNCHERS.length,3);
  assert.deepEqual([starter.range,starter.baseDamage,starter.reloadSeconds],[620,30,7]);
  assert.deepEqual([breaker.range,breaker.baseDamage,breaker.reloadSeconds],[730,700,7]);
  assert.deepEqual([horizon.range,horizon.baseDamage,horizon.reloadSeconds,horizon.projectileSpeed,horizon.accuracy],[1100,40,1.3,47500,.95]);
  assert.equal(harpoonDamage(horizon),400);
  assert.equal(horizon.flameTip,true);
  assert.equal(horizon.acquisition.mission,'r3-dark-waters-warning');
});

test('R3 diary mission grants 100k gold and Horizon once, preserving owned launchers',()=>{
  const save=claimedSave();
  assert.deepEqual(R3_MISSIONS[1].reward.harpoonLaunchers,[HORIZON_HARPOON_ID]);
  const result=claimR3Mission(save,'r3-dark-waters-warning');
  assert.ok(result);
  assert.equal(result.patch.profile.gold,100250);
  assert.deepEqual(result.patch.equipment.ownedHarpoonIds,
    ['naval-harpoon-starter','harpoon-armor-breaker-launcher',HORIZON_HARPOON_ID]);
  assert.equal(result.patch.equipment.equippedHarpoonId,HORIZON_HARPOON_ID);
  assert.deepEqual(result.patch.equipment.ownedShipIds,['my-ship']);
  assert.equal(equippedHarpoon({...save,...result.patch}).id,HORIZON_HARPOON_ID);
  assert.equal(claimR3Mission({...save,...result.patch},'r3-dark-waters-warning'),null);
});

test('Already claimed mission can backfill launcher without repeating gold reward',()=>{
  const save={...claimedSave(),r3Campaign:{active:null,claimed:['r3-equip-golden','r3-dark-waters-warning']}};
  const patch=grantR3HorizonHarpoon(save);
  assert.ok(patch);
  assert.equal(patch.equippedHarpoonId,HORIZON_HARPOON_ID);
  assert.equal(grantR3HorizonHarpoon({...save,equipment:patch}),null);
  assert.equal(save.profile.gold,250);
  assert.equal(claimR3Mission(save,'r3-dark-waters-warning'),null);
});

test('Horizon fires a burning 50x-speed harpoon, deals 400 and reloads in 1.3s',()=>{
  let now=1000;
  let save={equipment:{ownedHarpoonIds:[HORIZON_HARPOON_ID],equippedHarpoonId:HORIZON_HARPOON_ID},
    harpoonAmmo:{'harpoon-mariner':3,'harpoon-armor-piercing':6},combat:{shipHealth:100}};
  const monster={id:'long-range-monster',type:'monster',name:'Monstro',health:1000,maxHealth:1000,state:'idle',x:1000,y:0};
  const shots=[];
  const battle=new NavalBattleController({
    renderer:{prepareAmmo(){},fire(shot){shots.push(shot);return true;},getKrakenAttacks(){return []}},
    readSave:()=>save,writePatch:patch=>{save={...save,...patch}},
    getPlayer:()=>({x:0,y:0}),getEntities:()=>new Map([[monster.id,monster]]),
    shipId:'starter',clock:()=>now,random:()=>.5,
  });
  battle.setTarget(monster.id);
  assert.equal(battle.getHarpoonStatus().ready,true);
  assert.equal(battle.fireHarpoon(),true);
  assert.equal(shots.length,1);
  assert.equal(save.harpoonAmmo['harpoon-mariner'],2);
  assert.ok(Math.abs(shots[0].duration - 1000/47500*1000)<.001);
  assert.equal(shots[0].ammo.id,'naval-harpoon-horizon');
  assert.equal(shots[0].ammo.projectileSpeed,47500);
  assert.equal(shots[0].ammo.name,'Arpão Incandescente');
  assert.equal(save.harpoonAmmo['harpoon-armor-piercing'],6);
  assert.equal(shots[0].onImpact({at:{x:1000,y:0}}).kind,'ship');
  assert.equal(monster.health,600);
  now=2299;
  assert.equal(battle.getHarpoonStatus().ready,false);
  now=2300;
  assert.equal(battle.getHarpoonStatus().ready,true);
  monster.x=1101;
  assert.equal(battle.getHarpoonStatus().ready,false);
});
