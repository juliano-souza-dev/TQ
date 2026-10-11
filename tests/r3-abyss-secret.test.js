import test from 'node:test';import assert from 'node:assert/strict';
import {R3} from '../src/world/regions/r3.js';
import {R3_ABYSS_SECRET_MISSION_ID,R3_ABYSS_WRECKS,getR3Board,acceptR3Mission,recordR3Event,claimR3Mission,R3_LEVIATHAN_MISSION_ID} from '../src/missions/RegionThreeCampaign.js';
const base=()=>({r3Campaign:{claimed:['r3-equip-golden','r3-dark-waters-warning','r3-silas-pact',R3_LEVIATHAN_MISSION_ID]},profile:{gold:10,rubies:5}});
test('Region 3 triples Red guardian count with balanced 12000 HP',()=>{
 const reds=R3.terrorRaiders.filter(x=>x.role==='terror-guardian');
 assert.equal(reds.length,3);assert.ok(reds.every(x=>x.maxHealth===12000));
});
test('Mission 5 unlocks only after claimed Leviathan',()=>{
 assert.equal(getR3Board({r3Campaign:{claimed:[]}}).missions[4].status,'locked');
 const save=base();assert.equal(getR3Board(save).missions[4].status,'available');
 const patch=acceptR3Mission(save,R3_ABYSS_SECRET_MISSION_ID);assert.equal(patch.r3Campaign.active,R3_ABYSS_SECRET_MISSION_ID);
});
test('Five unique Red sink events and three unique wrecks progress independently',()=>{
 let save={...base(),...acceptR3Mission(base(),R3_ABYSS_SECRET_MISSION_ID)};
 const ev=e=>{const p=recordR3Event(save,e);if(p)save={...save,...p};return p;};
 assert.ok(ev({type:'abyss-fragment',id:R3_ABYSS_WRECKS[0].id}));
 assert.ok(ev({type:'abyss-red-sunk',archetype:'terror-guardian',id:'red-1:0'}));
 assert.equal(ev({type:'abyss-red-sunk',archetype:'terror-guardian',id:'red-1:0'}),null);
 assert.equal(ev({type:'abyss-red-sunk',archetype:'dark-waters-raider',id:'raider'}),null);
 for(let n=2;n<=5;n++)assert.ok(ev({type:'abyss-red-sunk',archetype:'terror-guardian',id:'red-'+n+':0'}));
 for(const w of R3_ABYSS_WRECKS.slice(1))assert.ok(ev({type:'abyss-fragment',id:w.id}));
 assert.equal(getR3Board(save).missions[4].status,'active');
 assert.ok(ev({type:'return-port'}));
 assert.equal(getR3Board(save).missions[4].status,'ready');
 const claim=claimR3Mission(save,R3_ABYSS_SECRET_MISSION_ID);
 assert.equal(claim.patch.profile.gold,15010);assert.equal(claim.patch.profile.rubies,5);
 assert.equal(claim.patch.r3Campaign.abyssHeartMap,true);
 assert.equal(claimR3Mission({...save,...claim.patch},R3_ABYSS_SECRET_MISSION_ID),null);
});
