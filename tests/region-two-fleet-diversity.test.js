import test from 'node:test';
import assert from 'node:assert/strict';
import {R1} from '../src/world/regions/r1.js';
import {R2} from '../src/world/regions/r2.js';
import {createCorsairPopulation,updateCorsairPopulation,R2_CORSAIR_PROFILES,CORSAIR_POPULATION}
  from '../src/npcs/CorsairPopulation.js';
import {fleetRole,recordFleetDefeat} from '../src/missions/FleetCampaign.js';
import {RED_SAIL_CORSAIR} from '../src/npcs/RedSailCorsair.js';

const makeWorld=region=>({
 region,fleetNoRespawn:true,camera:{...region.spawn},
 entities:new Map(),
});

test('R2 has 20 fleet ships belonging to at least four different hulls and strengths',()=>{
 const world=makeWorld(R2);
 assert.equal(CORSAIR_POPULATION,20);
 assert.equal(createCorsairPopulation(world,Math.random),20);
 const ships=[...world.entities.values()];
 assert.equal(ships.length,20);
 assert.equal(new Set(ships.map(n=>n.id)).size,20);
 assert.equal(new Set(ships.map(n=>n.shipId)).size,4);
 assert.equal(new Set(ships.map(n=>n.name)).size,8);
 assert.equal(new Set(ships.map(n=>n.maxHealth)).size,20);
 assert.ok(ships.every(n=>n.health>25&&n.health===n.maxHealth));
 assert.ok(Math.max(...ships.map(n=>n.health))>=6000);
 assert.ok(ships.every(n=>fleetRole('r2',n)==='enemy'));
 for(const [i,ship] of ships.entries()){
   assert.equal(ship.id,'corsair-r1-'+String(i+1).padStart(2,'0'),
     'preserve IDs so old kill records remain valid');
   assert.equal(ship.archetype,RED_SAIL_CORSAIR.id);
   assert.equal(ship.shipId,R2_CORSAIR_PROFILES[i%4].shipId);
 }
});
test('R2 keeps its 20-target objective and never respawns a defeated ship in fleet mode',()=>{
 const world=makeWorld(R2);
 createCorsairPopulation(world,Math.random);
 const sunk=world.entities.get('corsair-r1-01');
 sunk.health=0;
 updateCorsairPopulation(world,90000,()=>.5);
 assert.equal(sunk.health,0);
 const save={fleetCampaign:{version:1,region:2,defeated:{},treasures:{},bosses:{}}};
 const patch=recordFleetDefeat(save,'r2',sunk);
 assert.deepEqual(patch.fleetCampaign.defeated.r2,['corsair-r1-01']);
});
test('R1 still spawns the original 25-health pirates without changing the first boss',()=>{
 const world=makeWorld(R1);
 createCorsairPopulation(world,Math.random);
 const pirates=[...world.entities.values()].filter(n=>n.archetype===RED_SAIL_CORSAIR.id);
 assert.equal(pirates.length,19);
 assert.ok(pirates.every(n=>n.maxHealth===25));
 assert.equal([...world.entities.values()].filter(n=>n.archetype==='terror-da-tabuada').length,1);
});
