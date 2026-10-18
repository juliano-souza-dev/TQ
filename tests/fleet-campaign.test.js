import test from 'node:test';
import assert from 'node:assert/strict';
import {startFleetCampaign, fleetEnabled, fleetProgress, recordFleetDefeat,
  recordFleetTreasure, finishFleetRegion, getFleetTreasures} from '../src/missions/FleetCampaign.js';
import {grantFleetPreparation,reconcileFleetEquipment,bestFleetLoadout,FLEET_PLAYER_SHIPS}
  from '../src/ships/FleetAutoEquipment.js';
import {createCorsairPopulation,updateCorsairPopulation} from '../src/npcs/CorsairPopulation.js';

const combine=(save,patch)=>({...save,...patch});
const fresh=(region=1)=>{
  const save=combine({},startFleetCampaign({}));
  return {...save,fleetCampaign:{...save.fleetCampaign,region,
    treasureGoal:{['r'+region]:1}}};
};
const winEnemies=(save,region,count,kind)=>{
  for(let i=0;i<count;i++){
    const patch=recordFleetDefeat(save,region,{id:'enemy-'+i,archetype:kind});
    assert.ok(patch,'kill '+i+' counted');
    save=combine(save,patch);
  }
  return save;
};
const treasureId=region=>getFleetTreasures({},region)[0].id;

test('campaign always begins in region 1 and preserves the existing inventory',()=>{
  const save=startFleetCampaign({equipment:{ownedShipIds:['other-ship']},ammunition:{'volcanic-lava':34}});
  assert.equal(save.progression.activeRegion,1);
  assert.ok(fleetEnabled(save));
  assert.ok(save.equipment.ownedShipIds.includes('other-ship'));
  assert.equal(save.ammunition['volcanic-lava'],34);
});
test('boss cannot appear before the entire fleet AND every treasure are cleared',()=>{
  let save=fresh(1);
  let p=fleetProgress(save,'r1',1);
  assert.equal(p.ready,false);
  save=winEnemies(save,'r1',19,'red-sail-corsair');
  p=fleetProgress(save,'r1',1);
  assert.equal(p.ready,false);
  assert.equal(p.encounter,null);
  assert.equal(recordFleetTreasure(save,'r1','fleet-r1-invented'),null);
  const patch=recordFleetTreasure(save,'r1',treasureId('r1'));
  save=combine(save,patch);
  p=fleetProgress(save,'r1',1);
  assert.equal(p.missionOneComplete,false,'marine monsters are still required');
  save=combine(save,{fleetCampaign:{...save.fleetCampaign,monsters:{r1:['kraken-1','kraken-2']}}});
  assert.equal(fleetProgress(save,'r1',1).missionOneComplete,true);
  assert.equal(fleetProgress(save,'r1',1).ready,false,'mission 1 reward must be claimed');
  save=combine(save,{fleetCampaign:{...save.fleetCampaign,preparedRegions:['r1']}});
  p=fleetProgress(save,'r1',1);
  assert.equal(p.ready,true);
  assert.equal(p.encounter.id,'terror-da-tabuada');
});
test('defeats and treasures never count twice',()=>{
  let save=fresh(1);
  save=combine(save,recordFleetDefeat(save,'r1',{id:'a',archetype:'red-sail-corsair'}));
  assert.equal(recordFleetDefeat(save,'r1',{id:'a',archetype:'red-sail-corsair'}),null);
  const t=treasureId('r1');
  save=combine(save,recordFleetTreasure(save,'r1',t));
  assert.equal(recordFleetTreasure(save,'r1',t),null);
});
test('R1 boss awards the ship and changes region only after victory',()=>{
  let save=winEnemies(fresh(1),'r1',19,'red-sail-corsair');
  assert.equal(finishFleetRegion(save,'r1',1),null);
  save=combine(save,recordFleetTreasure(save,'r1',treasureId('r1')));
  save=combine(save,{fleetCampaign:{...save.fleetCampaign,preparedRegions:['r1'],monsters:{r1:['m1','m2']}}});
  const victory=recordFleetDefeat(save,'r1',{id:'corsair-r1-01',archetype:'terror-da-tabuada'});
  assert.ok(victory);
  save=combine(save,victory);
  assert.ok(save.equipment.ownedShipIds.includes('galeao-halloween-tabuada'));
  const next=finishFleetRegion(save,'r1',1);
  assert.equal(next.progression.activeRegion,2);
  assert.equal(next.fleetCampaign.completedRegions.length,1);
  assert.equal(finishFleetRegion({...save,...next},'r1',1),null);
});
test('R2 finishes after the fugitive: Morbi must wait for R5',()=>{
  let save=winEnemies(fresh(2),'r2',20,'red-sail-corsair');
  save=combine(save,recordFleetTreasure(save,'r2',treasureId('r2')));
  save=combine(save,{fleetCampaign:{...save.fleetCampaign,preparedRegions:['r2'],monsters:{r2:['m1','m2']}}});
  assert.equal(fleetProgress(save,'r2',1).encounter.id,'fugitive-frigate');
  assert.equal(recordFleetDefeat(save,'r2',{id:'r2-morbi',archetype:'golden-galleon'}),null);
  const pursuit=grantFleetPreparation(save,'r2',{fugitive:true});
  assert.ok(pursuit.equipment.ownedShipIds.includes('fragata-sombra-cacadora'));
  save=combine(save,recordFleetDefeat(save,'r2',{id:'fugitive-frigate-r2-01',archetype:'fugitive-frigate'}));
  assert.equal(fleetProgress(save,'r2',1).complete,true);
  assert.ok(save.equipment.ownedShipIds.includes('fragata-sombra-cacadora'));
  assert.equal(save.equipment.cannonCounts['aetherion-mk1'],2);
  assert.equal(save.equipment.ownedShipIds.includes('galeao-dourado'),false);
  assert.equal(finishFleetRegion(save,'r2',1).progression.activeRegion,3);
});
test('R3 unlocks the harpoon without replacing saved ammunition',()=>{
  const save=fresh(3);
  const prepared=grantFleetPreparation(save,'r3');
  assert.equal(prepared.equipment.equippedHarpoonId,'harpoon-horizon-eye-launcher');
  assert.ok(prepared.harpoonAmmo['harpoon-horizon-incendiary']>=1000);
  const current={...save,...prepared,selectedNavalAmmoId:'volcanic-lava'};
  const automatic=reconcileFleetEquipment(current,'r3');
  assert.ok(automatic);
  assert.equal(automatic.ammunition,undefined);
  assert.equal(automatic.selectedNavalAmmoId,undefined);
});
test('R4 starts with earned ice ship, then continues to the fifth region',()=>{
  let save=winEnemies(fresh(4),'r4',30,'vigia-da-geada');
  save=combine(save,recordFleetTreasure(save,'r4',treasureId('r4')));
  const ice=grantFleetPreparation(save,'r4');
  assert.ok(ice.equipment.ownedCannonIds.includes('ice-terror'));
  save=combine(save,{fleetCampaign:{...save.fleetCampaign,preparedRegions:['r4']}});
  save=combine(save,recordFleetDefeat(save,'r4',{id:'r4-almirante-boreal',archetype:'frozen-mirror-boss',shipId:'corsario-geada-negra'}));
  assert.equal(fleetProgress(save,'r4',1).complete,true);
  const ending=finishFleetRegion(save,'r4',1);
  assert.equal(ending.fleetCampaign.finished,false);
  assert.equal(ending.progression.activeRegion,5);
});
test('ordinary pirates never respawn when campaign no-respawn mode is on',()=>{
 const npc={id:'corsair-r1-02',type:'npc',archetype:'red-sail-corsair',
   health:0,maxHealth:25,respawnRemainingMs:0};
 const world={fleetNoRespawn:true,region:{id:'r1',width:4096,height:4096,islands:[]},
   camera:{x:100,y:100},entities:new Map([[npc.id,npc]])};
 updateCorsairPopulation(world,40000);
 assert.equal(npc.health,0);
 assert.equal(npc.respawnRemainingMs,0);
});
test('ship selection comes from earned ships, not NPC-only catalog entries',()=>{
 const available=new Set(FLEET_PLAYER_SHIPS.map(ship=>ship.id));
 assert.ok(available.has('terror-do-mar'));
 assert.ok(available.has('fragata-sombra-cacadora'));
 assert.ok(!available.has('mercado-negro'));
 assert.ok(!available.has('r2-morbi'));
 const save=combine({},startFleetCampaign({}));
 const result=bestFleetLoadout(save,FLEET_PLAYER_SHIPS[0]);
 assert.equal(result.length,3);
});
