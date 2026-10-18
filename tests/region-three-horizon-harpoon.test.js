import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HARPOON_LAUNCHERS,HORIZON_HARPOON_ID,equippedHarpoon,harpoonDamage
} from '../src/combat/HarpoonCatalog.js';
import {
  R3_MISSIONS,claimR3Mission,acceptR3Mission,getR3Board
} from '../src/missions/RegionThreeCampaign.js';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';
import { R3_SILAS_MISSION_ID, R3_SILAS_REWARD, exchangeR3SilasCargo } from '../src/missions/R3SilasTrade.js';
import { CANNONS } from '../src/items/EquipmentCatalog.js';

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
  assert.equal(horizon.acquisition.mission,R3_SILAS_MISSION_ID);
});

test('R3 diaries grant gold only, then unlock Silas Pact',()=>{
  const save=claimedSave();
  assert.equal(R3_MISSIONS[1].reward.gold,10000);
  assert.equal(R3_MISSIONS[1].reward.harpoonLaunchers,undefined);
  const claim=claimR3Mission(save,'r3-dark-waters-warning');
  assert.ok(claim);
  assert.equal(claim.patch.profile.gold,10250);
  assert.equal(claim.patch.equipment,undefined);
  const after={...save,...claim.patch};
  assert.equal(getR3Board(after).missions[2].status,'available');
  const start=acceptR3Mission(after,R3_SILAS_MISSION_ID);
  assert.equal(start.r3Campaign.active,R3_SILAS_MISSION_ID);
  assert.equal(claimR3Mission(after,R3_SILAS_MISSION_ID),null);
});

test('Silas receives entire arsenal once and grants exact Terror da Abobora package',()=>{
  const save={
    ...claimedSave(),
    r3Campaign:{active:R3_SILAS_MISSION_ID,claimed:['r3-equip-golden','r3-dark-waters-warning']},
    profile:{gold:2300,rubies:9},
    equipment:{
      ...claimedSave().equipment,
      equippedShipId:'my-ship',
      cannonCounts:{'royal-lion':5,'aetherion-mk1':1,'blue-gold-pirate':2},
      ownedCannonIds:['royal-lion','aetherion-mk1','blue-gold-pirate'],
      loadout:{'my-ship':['royal-lion','blue-gold-pirate']},
    },
    ammunition:{'rusted-iron':999,'volcanic-lava':14,'aetherion-seeker':7,'terror-rose':800},
    harpoonAmmo:{'harpoon-mariner':800,'harpoon-armor-piercing':120},
    consumables:{selectedId:'shield',activeUntil:50000,shieldActiveUntil:50000,quantities:{shield:8,'flame-5x':4}},
    shipUpgrades:{masterShipwright:true},
  };
  assert.equal(CANNONS.find(c=>c.id==='pumpkin-terror').name,'Terror da Abóbora');
  assert.deepEqual(R3_SILAS_REWARD.cannons,{'aetherion-mk1':2,'pumpkin-terror':18});
  assert.equal(exchangeR3SilasCargo({...save,r3Campaign:{...save.r3Campaign,active:null}}),null);
  const patch=exchangeR3SilasCargo(save);
  assert.ok(patch);
  assert.deepEqual(patch.equipment.cannonCounts,{'aetherion-mk1':2,'pumpkin-terror':18});
  assert.deepEqual(patch.equipment.ownedCannonIds,['aetherion-mk1','pumpkin-terror']);
  assert.deepEqual(patch.equipment.loadout,{'my-ship':[
    'aetherion-mk1','aetherion-mk1',...Array(10).fill('pumpkin-terror'),
  ]});
  assert.equal(patch.r3Campaign.silasLoadoutReconciled,true);
  assert.equal(patch.equipment.equippedShipId,'my-ship');
  assert.equal(patch.equipment.starterCannonTransferredToSilas,true);
  assert.deepEqual(patch.equipment.ownedHarpoonIds,[HORIZON_HARPOON_ID]);
  assert.equal(patch.equipment.equippedHarpoonId,HORIZON_HARPOON_ID);
  assert.deepEqual(patch.ammunition,{'aetherion-seeker':2500,'volcanic-lava':2000,'terror-rose':250});
  assert.deepEqual(patch.harpoonAmmo,{'harpoon-horizon-incendiary':1000});
  assert.deepEqual(patch.consumables.quantities,{});
  assert.equal(patch.consumables.shieldActiveUntil,0);
  assert.equal(patch.r3Campaign.silasHoldings.cannonCounts['royal-lion'],5);
  assert.equal(patch.r3Campaign.silasHoldings.ammunition['terror-rose'],800);
  assert.equal(patch.r3Campaign.silasHoldings.harpoonAmmo['harpoon-armor-piercing'],120);
  assert.equal(patch.r3Campaign.silasHoldings.consumables.shield,8);
  assert.equal(patch.profile,undefined);
  assert.equal(patch.shipUpgrades,undefined);
  const next={...save,...patch};
  assert.equal(next.profile.gold,2300);
  assert.equal(next.profile.rubies,9);
  assert.equal(getR3Board(next).missions[2].status,'ready');
  assert.equal(exchangeR3SilasCargo(next),null);
  const claim=claimR3Mission(next,R3_SILAS_MISSION_ID);
  assert.ok(claim);
  assert.equal(claim.patch.equipment,undefined);
  assert.equal(claimR3Mission({...next,...claim.patch},R3_SILAS_MISSION_ID),null);
});
test('Horizon fires a burning 50x-speed harpoon, deals 800 and reloads in 0.65s',()=>{
  let now=1000;
  let save={equipment:{ownedHarpoonIds:[HORIZON_HARPOON_ID],equippedHarpoonId:HORIZON_HARPOON_ID},
    harpoonAmmo:{'harpoon-horizon-incendiary':3,'harpoon-mariner':3,'harpoon-armor-piercing':6},combat:{shipHealth:100}};
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
  assert.equal(save.harpoonAmmo['harpoon-horizon-incendiary'],2);
  assert.equal(save.harpoonAmmo['harpoon-mariner'],3);
  assert.ok(Math.abs(shots[0].duration - 1000/47500*1000)<.001);
  assert.equal(shots[0].ammo.id,'naval-harpoon-horizon');
  assert.equal(shots[0].ammo.projectileSpeed,47500);
  assert.equal(shots[0].ammo.name,'Arpão Incandescente');
  assert.equal(save.harpoonAmmo['harpoon-armor-piercing'],6);
  assert.equal(shots[0].onImpact({at:{x:1000,y:0}}).kind,'ship');
  assert.equal(monster.health,200);
  now=1649;
  assert.equal(battle.getHarpoonStatus().ready,false);
  now=1650;
  assert.equal(battle.getHarpoonStatus().ready,true);
  monster.x=1101;
  assert.equal(battle.getHarpoonStatus().ready,false);
});
