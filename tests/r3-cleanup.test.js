import test from 'node:test';import assert from 'node:assert/strict';
import {R3_CLEANUP_MISSION_ID,R3_CLEANUP_RED_IDS,R3_REBUILD_MISSION_ID,getR3Board,acceptR3Mission,recordR3Event,claimR3Mission} from '../src/missions/RegionThreeCampaign.js';
const base=()=>({r3Campaign:{claimed:['r3-equip-golden','r3-dark-waters-warning','r3-silas-pact','r3-leviathan-hunt','r3-abyss-secret','r3-abyss-flame','r3-terror-awakening',R3_REBUILD_MISSION_ID]},progression:{unlockedRegion:3},profile:{gold:500}});
test('cleanup unlocks after reconstruction but region four does not unlock early',()=>{
 const save=base();assert.equal(getR3Board(save).missions[8].status,'available');
 const accepted=acceptR3Mission(save,R3_CLEANUP_MISSION_ID);
 assert.equal(accepted.r3Campaign.active,R3_CLEANUP_MISSION_ID);
 assert.equal(claimR3Mission({...save,...accepted},R3_CLEANUP_MISSION_ID),null);
});
test('cleanup requires each of three distinct Reds and a port return, grants once',()=>{
 let save={...base(),...acceptR3Mission(base(),R3_CLEANUP_MISSION_ID)};
 const event=e=>{const p=recordR3Event(save,e);if(p)save={...save,...p};return p;};
 assert.equal(event({type:'cleanup-red-sunk',id:'r3-sombra-do-saque'}),null);
 assert.ok(event({type:'cleanup-red-sunk',id:R3_CLEANUP_RED_IDS[0]}));
 assert.equal(event({type:'cleanup-red-sunk',id:R3_CLEANUP_RED_IDS[0]}),null);
 assert.equal(event({type:'return-port'}),null);
 for(const id of R3_CLEANUP_RED_IDS.slice(1))assert.ok(event({type:'cleanup-red-sunk',id}));
 assert.ok(event({type:'return-port'}));
 assert.equal(getR3Board(save).missions[8].status,'ready');
 const reward=claimR3Mission(save,R3_CLEANUP_MISSION_ID);
 assert.equal(reward.patch.profile.gold,15500);
 assert.equal(reward.patch.progression.unlockedRegion,4);
 assert.equal(claimR3Mission({...save,...reward.patch},R3_CLEANUP_MISSION_ID),null);
});
test('accepting cleanup grants five strongest and two special cannons once and inherits shipyard slots',async()=>{
 const {TERROR_DO_MAR_SHIP}=await import('../src/ships/TerrorDoMarShip.js');
 assert.equal(TERROR_DO_MAR_SHIP.cannonSlots,7);
 const save={...base(),shipUpgrades:{masterShipwright:true},equipment:{
   equippedShipId:'terror-do-mar',ownedCannonIds:['pumpkin-terror','aetherion-mk1'],
   cannonCounts:{'pumpkin-terror':3,'aetherion-mk1':1},
   loadout:{'terror-do-mar':['pumpkin-terror','aetherion-mk1']}}};
 const grant=acceptR3Mission(save,R3_CLEANUP_MISSION_ID);
 assert.equal(grant.equipment.cannonCounts['pumpkin-terror'],8);
 assert.equal(grant.equipment.cannonCounts['aetherion-mk1'],3);
 assert.equal(grant.equipment.loadout['terror-do-mar'].length,9);
 assert.deepEqual(grant.equipment.loadout['terror-do-mar'].slice(0,2),['pumpkin-terror','aetherion-mk1']);
 assert.equal(acceptR3Mission({...save,...grant},R3_CLEANUP_MISSION_ID),null);
});
