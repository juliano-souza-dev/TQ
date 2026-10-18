import test from 'node:test';
import assert from 'node:assert/strict';
import { FLEET_REGIONS, fleetProgress, fleetRole, recordFleetDefeat, finishFleetRegion } from '../src/missions/FleetCampaign.js';
import { FUTURE_FLEET_REGIONS, fleetExitPoint } from '../src/world/regions/FutureFleetRegions.js';
import { createFleetPopulation } from '../src/npcs/FleetPopulation.js';
import { R3 } from '../src/world/regions/r3.js';
import { R4 } from '../src/world/regions/r4.js';
import { REGION_FAMILIES, chooseRegionChallenge } from '../src/education/RegionMastery.js';
import { grantFleetEntry, grantFleetPreparation, FLEET_PLAYER_SHIPS } from '../src/ships/FleetAutoEquipment.js';

const ids=Object.keys(FLEET_REGIONS);
function base(region=1){
 return {fleetCampaign:{version:1,region,defeated:{},monsters:{},treasures:{},bosses:{},
  preparedRegions:[],completedRegions:[]},equipment:{ownedShipIds:['starter-red-sails']}};
}
test('all twelve regions have enemies, missions, bosses and matching curriculum',()=>{
 assert.equal(ids.length,12);
 for(let n=1;n<=12;n++){
  const p=FLEET_REGIONS['r'+n];
  assert.ok(p.enemyGoal>=16);
  assert.ok(Array.isArray(p.encounters)&&p.encounters.length>=1);
  assert.ok(REGION_FAMILIES[n].length>=1);
  const q=chooseRegionChallenge({},null,()=>0,n);
  assert.equal(q.region,n);
  assert.ok(REGION_FAMILIES[n].includes(q.family));
 }
});
test('first mission requires enemies, monsters and treasures before boss unlock',()=>{
 const save=base(5),p=FLEET_REGIONS.r5;
 const map={...save.fleetCampaign,preparedRegions:['r5'],
  defeated:{r5:Array.from({length:p.enemyGoal},(_,i)=>'npc'+i)},
  monsters:{r5:['monster-1','monster-2']},treasures:{r5:['treasure-1']}};
 const complete={...save,fleetCampaign:map};
 assert.equal(fleetProgress(save,'r5',1).ready,false);
 assert.equal(fleetProgress(complete,'r5',1).ready,true);
 assert.equal(fleetProgress({...complete,fleetCampaign:{...map,preparedRegions:[]}},'r5',1).ready,false);
});
test('boss reward is only awarded once and exit travels only after complete',()=>{
 const c=base(5),p=FLEET_REGIONS.r5;
 c.fleetCampaign.preparedRegions=['r5'];
 c.fleetCampaign.defeated.r5=Array.from({length:p.enemyGoal},(_,i)=>'npc-'+i);
 c.fleetCampaign.monsters.r5=['m1','m2'];
 c.fleetCampaign.treasures.r5=['t1'];
 const boss={id:'r5-eclipse',type:'npc',archetype:'eclipse-mirror-boss',shipId:'galeao-eclipse'};
 assert.equal(fleetRole('r5',boss),'boss');
 assert.equal(fleetRole('r2',boss),null,'Eclipse must not be an R2 boss');
 const win=recordFleetDefeat(c,'r5',boss);
 assert.ok(win.equipment.ownedShipIds.includes('galeao-eclipse'));
 assert.equal(win.equipment.equippedShipId,'galeao-eclipse');
 const after={...c,...win};
 assert.equal(recordFleetDefeat(after,'r5',boss),null);
 assert.equal(fleetProgress(after,'r5',1).complete,true);
 const travel=finishFleetRegion(after,'r5',1);
 assert.equal(travel.progression.activeRegion,6);
 assert.equal(travel.fleetCampaign.region,6);
 assert.equal(finishFleetRegion(c,'r5',1),null);
});
test('final region finishes but never travels to a thirteenth region',()=>{
 const c=base(12),p=FLEET_REGIONS.r12;
 c.fleetCampaign.preparedRegions=['r12'];
 c.fleetCampaign.defeated.r12=Array.from({length:p.enemyGoal},(_,i)=>'npc-'+i);
 c.fleetCampaign.monsters.r12=['m1','m2'];
 c.fleetCampaign.bosses.r12=['r12-last'];
 const result=finishFleetRegion(c,'r12',0);
 assert.equal(result.fleetCampaign.finished,true);
 assert.equal(result.progression.activeRegion,12);
});
test('regional fleets include multiple distinct ship models',()=>{
 for(const region of [R3,R4,...Object.values(FUTURE_FLEET_REGIONS)]){
  const world={region,camera:{...region.spawn},fleetNoRespawn:true,entities:new Map()};
  const amount=createFleetPopulation(world,()=>.431);
  assert.ok(amount>0);
  const ships=new Set([...world.entities.values()].map(n=>n.shipId));
  assert.ok(ships.size>=3,region.id+' contains varied ships');
  for(const n of world.entities.values())assert.equal(fleetRole(region.id,n),'enemy');
  const exit=fleetExitPoint(region);
  assert.ok(exit.x>0&&exit.x<region.width&&exit.y>0&&exit.y<region.height);
 }
});
test('ice ship arrives through opening challenge and emerald ghost after mission one',()=>{
 const save=base(3);
 const shadow=grantFleetEntry(save,'r3');
 assert.ok(shadow.equipment.ownedShipIds.includes('sombra-fugitiva-verde-fantasma'));
 assert.equal(shadow.equipment.equippedShipId,'sombra-fugitiva-verde-fantasma');
 assert.equal(FLEET_PLAYER_SHIPS.find(ship=>ship.id==='sombra-fugitiva-verde-fantasma').cannonSlots,6);
 assert.equal(shadow.equipment.cannonCounts['royal-lion'],4);
 assert.deepEqual(shadow.equipment.loadout['sombra-fugitiva-verde-fantasma'],
   ['aetherion-mk1','aetherion-mk1','royal-lion','royal-lion','royal-lion','royal-lion']);
 const ghost=grantFleetPreparation({...save,equipment:shadow.equipment},'r3');
 assert.ok(ghost.equipment.ownedShipIds.includes('fantasma-esmeralda'));
 const ice=grantFleetEntry(save,'r4');
 assert.ok(ice.equipment.ownedShipIds.includes('corsario-geada-negra'));
 for(const id of ['galeao-eclipse','galeao-caveira-rubra','corsario-do-veu-negro','fantasma-esmeralda','corsario-geada-negra'])
  assert.ok(FLEET_PLAYER_SHIPS.some(s=>s.id===id&&s.playable&&s.speed));
});

test('R3 green ship upgrades old loadouts, keeping two guided guns and filling all slots',()=>{
 const save=base(3);
 save.equipment={...save.equipment,
  equippedShipId:'sombra-fugitiva-verde-fantasma',
  ownedShipIds:['starter-red-sails','sombra-fugitiva-verde-fantasma'],
  ownedCannonIds:['aetherion-mk1','royal-lion','spectral-necromancer'],
  cannonCounts:{'aetherion-mk1':7,'royal-lion':7,'spectral-necromancer':2},
  loadout:{'sombra-fugitiva-verde-fantasma':['aetherion-mk1','aetherion-mk1','aetherion-mk1','aetherion-mk1']}};
 const upgrade=grantFleetEntry(save,'r3');
 assert.deepEqual(upgrade.equipment.loadout['sombra-fugitiva-verde-fantasma'],
  ['aetherion-mk1','aetherion-mk1','spectral-necromancer','spectral-necromancer','royal-lion','royal-lion']);
 assert.equal(upgrade.equipment.loadout['sombra-fugitiva-verde-fantasma'].length,6);
 assert.equal(upgrade.equipment.loadout['sombra-fugitiva-verde-fantasma'].filter(id=>id==='aetherion-mk1').length,2);
 assert.equal(upgrade.equipment.cannonCounts['aetherion-mk1'],7,
  'surplus guided cannons stay owned, but are not equipped on the green ship');
 assert.deepEqual(grantFleetEntry({...save,equipment:upgrade.equipment},'r3').equipment.loadout,
  upgrade.equipment.loadout,'migration is idempotent');
});
