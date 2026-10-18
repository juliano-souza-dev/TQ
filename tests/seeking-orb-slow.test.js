import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEEKING_ORB_SLOW_PER_HIT,SEEKING_ORB_SLOW_MAX,SEEKING_ORB_SLOW_DURATION_MS,
  applySeekingOrbSlow,getSeekingOrbSlow,seekingOrbMovementSpeed,
} from '../src/combat/SeekingOrbSlow.js';
import {applyR2CorsairProfile,updateCorsairPopulation} from '../src/npcs/CorsairPopulation.js';
import {RED_SAIL_CORSAIR,createRedSailCorsair} from '../src/npcs/RedSailCorsair.js';
import {R2} from '../src/world/regions/r2.js';

const npc=()=>({type:'npc',health:1000,shipId:'corsario-vermelho-sangue',speed:250});
test('a confirmed guided-orb hit slows a living enemy ship by 2% for 35 seconds',()=>{
 const target=npc(),now=200_000;
 assert.equal(SEEKING_ORB_SLOW_PER_HIT,.02);
 assert.equal(SEEKING_ORB_SLOW_DURATION_MS,35000);
 assert.equal(applySeekingOrbSlow(target,'aetherion-seeker',now),.02);
 assert.equal(getSeekingOrbSlow(target,now+34999),.02);
 assert.equal(seekingOrbMovementSpeed(target,250,now+34999),245);
 assert.equal(getSeekingOrbSlow(target,now+35000),0);
 assert.equal(seekingOrbMovementSpeed(target,250,now+35000),250);
});
test('each hit lasts 35s independently, expiring without extending earlier hits',()=>{
 const target=npc(),now=100000;
 applySeekingOrbSlow(target,'aetherion-seeker',now);
 applySeekingOrbSlow(target,'glacial-seeker',now+10000);
 assert.equal(getSeekingOrbSlow(target,now+20000),.04);
 assert.equal(getSeekingOrbSlow(target,now+35000),.02);
 assert.equal(getSeekingOrbSlow(target,now+44999),.02);
 assert.equal(getSeekingOrbSlow(target,now+45000),0);
});
test('many tracking-orb hits cap at 75%, leaving at least 25% movement speed',()=>{
 const target=npc(),now=1000;
 for(let i=0;i<80;i++)applySeekingOrbSlow(target,'aetherion-seeker',now);
 assert.equal(getSeekingOrbSlow(target,now),SEEKING_ORB_SLOW_MAX);
 assert.equal(target.seekingOrbSlowExpiries.length,38);
 assert.equal(seekingOrbMovementSpeed(target,250,now),62.5);
 assert.equal(getSeekingOrbSlow(target,now+35000),0);
});
test('normal shells, missed shots, monsters and the player receive no slow',()=>{
 const enemy=npc();
 assert.equal(applySeekingOrbSlow(enemy,'rusted-iron',1000),0);
 assert.equal(enemy.seekingOrbSlowExpiries,undefined);
 assert.equal(applySeekingOrbSlow({...enemy,type:'monster'},'aetherion-seeker',1000),0);
 assert.equal(applySeekingOrbSlow({...enemy,type:'player'},'aetherion-seeker',1000),0);
 assert.equal(applySeekingOrbSlow({...enemy,health:0},'aetherion-seeker',1000),0);
});
test('R2 corsair movement uses the reduced speed and never changes the base ship specification',()=>{
 const world={region:R2,fleetNoRespawn:true,camera:{x:400,y:1000},entities:new Map()};
 const current=createRedSailCorsair('corsair-r1-02',2200,2700,90);
 applyR2CorsairProfile(current,1);
 const baseline=current.patrolSpeed;
 const first={...current,wanderTimeMs:50000};
 const slow={...first,seekingOrbSlowExpiries:[Date.now()+35000]};
 world.entities.set('corsair-r1-02',slow);
 updateCorsairPopulation(world,1000,()=>.5);
 const slowDistance=Math.hypot(slow.x-2200,slow.y-2700);
 world.entities.set('corsair-r1-02',first);
 updateCorsairPopulation(world,1000,()=>.5);
 const fullDistance=Math.hypot(first.x-2200,first.y-2700);
 assert.ok(slowDistance<fullDistance,'R2 enemy should move less with a debuff');
 assert.equal(slow.patrolSpeed,baseline,'do not permanently change base speed');
 assert.equal(first.patrolSpeed,baseline);
});
