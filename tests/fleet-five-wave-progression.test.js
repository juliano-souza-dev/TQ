import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldState} from '../src/world/WorldState.js';
import {R4} from '../src/world/regions/r4.js';
import {FUTURE_FLEET_REGIONS} from '../src/world/regions/FutureFleetRegions.js';
import {createFleetPopulation} from '../src/npcs/FleetPopulation.js';
import {createCorsairPopulation} from '../src/npcs/CorsairPopulation.js';
import {FLEET_REGIONS, fleetWaveStatus, fleetProgress,
  getFleetTreasures, fleetTreasureGoal, recordFleetTreasure} from '../src/missions/FleetCampaign.js';

function save(regionId){return {fleetCampaign:{version:1,region:Number(regionId.slice(1)),
  defeated:{},treasures:{},monsters:{},bosses:{},preparedRegions:[]}};}
function world(region){const w=createWorldState(region);w.fleetNoRespawn=true;return w;}
test('R4 campaign is longer and splits 30 fleet enemies into five waves of six',()=>{
 assert.equal(FLEET_REGIONS.r4.enemyGoal,30);
 const current=save('r4'),w=world(R4);
 const defaultPopulation=createCorsairPopulation(w,()=>.4);
 assert.ok(defaultPopulation<=2,'only merchant and boss, no legacy R4 crowds');
 assert.equal(createFleetPopulation(w,()=>.4,current),6);
 assert.equal([...w.entities.values()].filter(n=>n.archetype==='fleet-raider').length,6);
 assert.equal(createFleetPopulation(w,()=>.4,current),0,'no duplicate actors');
 for(let wave=1;wave<=5;wave++){
  const defeated=current.fleetCampaign.defeated.r4??[];
  const active=[...w.entities.values()].filter(n=>n.archetype==='fleet-raider');
  assert.equal(active.length,6,'one wave visible at a time');
  for(const npc of active){defeated.push(npc.id);w.entities.delete(npc.id);}
  current.fleetCampaign.defeated.r4=defeated;
  const next=createFleetPopulation(w,()=>.4,current);
  assert.equal(next,wave<5?6:0);
  assert.equal(fleetWaveStatus('r4',30,defeated.length)?.stage,Math.min(5,wave+1));
 }
 assert.equal(current.fleetCampaign.defeated.r4.length,30);
 assert.equal(createFleetPopulation(w,()=>.4,current),0);
});
test('from R4 to R12 all five-wave boundaries cover 100% without overcrowding',()=>{
 for(let number=4;number<=12;number++){
  const region='r'+number,total=FLEET_REGIONS[region].enemyGoal;
  const plans=Array.from({length:5},(_,i)=>fleetWaveStatus(region,total,
   i===0?0:Math.ceil(total*i/5)));
  assert.equal(plans[4].limit,total);
  for(let i=0;i<5;i++){
   const cap=Math.ceil(total*(i+1)/5);
   assert.equal(plans[i].limit,cap);
   assert.ok(cap-(i?plans[i-1].limit:0)<=Math.ceil(total/5));
  }
  const w=world(number===4?R4:FUTURE_FLEET_REGIONS[region]);
  const current=save(region);
  const first=createFleetPopulation(w,()=>.42,current);
  assert.equal(first,Math.ceil(total/5),region+' initial load');
  assert.ok(first<total);
 }
 assert.equal(fleetWaveStatus('r3',16,0),null,'previous maps are unchanged');
});
test('R4 and later show treasure batches of 20% and validate claims against the active batch',()=>{
 const current=save('r4');
 const goal=fleetTreasureGoal('r4',R4);
 assert.ok(goal>18,'R4 has more collectible treasures than before');
 const waveOne=getFleetTreasures(current,'r4',R4);
 assert.equal(waveOne.length,Math.ceil(goal/5));
 const allSeen=new Set();
 for(let stage=1;stage<=5;stage++){
  const active=getFleetTreasures(current,'r4',R4);
  assert.equal(fleetWaveStatus('r4',goal,current.fleetCampaign.treasures.r4?.length??0)?.stage,stage);
  const expected=Math.ceil(goal*stage/5)-Math.ceil(goal*(stage-1)/5);
  assert.equal(active.length,expected,'only current 20% visible');
  const hidden=getFleetTreasures({...current,fleetCampaign:{...current.fleetCampaign,
    treasures:{r4:[]}}},'r4',R4).filter(t=>!active.some(a=>a.id===t.id));
  if(stage===1){
   const all=getFleetTreasures({},'r4',R4);
   // A future treasure must not be claimable before the first wave is cleared.
   assert.equal(all.length,waveOne.length);
  }
  for(const t of active){
   assert.equal(allSeen.has(t.id),false);
   const patch=recordFleetTreasure(current,'r4',t.id,R4);
   assert.ok(patch);
   Object.assign(current,patch);
   allSeen.add(t.id);
   assert.equal(recordFleetTreasure(current,'r4',t.id,R4),null);
  }
 }
 assert.equal(allSeen.size,goal);
 assert.deepEqual(getFleetTreasures(current,'r4',R4),[]);
});
test('save reload shows only unfinished waves and never duplicates defeated ships or collected treasure',()=>{
 const current=save('r5'),region=FUTURE_FLEET_REGIONS.r5;
 const w=world(region);
 createFleetPopulation(w,()=>.4,current);
 const first=[...w.entities.values()].filter(n=>n.archetype==='fleet-raider');
 const defeated=first.map(n=>n.id);
 current.fleetCampaign.defeated.r5=defeated;
 const recovered=world(region);
 const next=createFleetPopulation(recovered,()=>.4,current);
 assert.ok(next>0);
 for(const npc of recovered.entities.values())assert.equal(defeated.includes(npc.id),false);
 const total=fleetTreasureGoal('r5',region);
 const batch=getFleetTreasures(current,'r5',region);
 assert.equal(batch.length,Math.ceil(total/5));
 const claimed=batch.map(t=>t.id);
 current.fleetCampaign.treasures.r5=claimed;
 const after=getFleetTreasures(current,'r5',region);
 assert.ok(after.every(t=>!claimed.includes(t.id)));
 assert.equal(after.length,Math.ceil(total*2/5)-Math.ceil(total/5));
 const progress=fleetProgress(current,'r5',total);
 assert.equal(progress.enemyWave.stage,2);
 assert.equal(progress.treasureWave.stage,2);
});

test('legacy R4 saves with old defeated NPC IDs never spawn all new enemies at once',()=>{
 const current=save('r4'),w=world(R4);
 current.fleetCampaign.defeated.r4=Array.from({length:24},(_,i)=>'r4-old-guard-'+i);
 const spawned=createFleetPopulation(w,()=>.37,current);
 assert.equal(spawned,6,'migrating saves must still have only 20% alive');
 assert.equal([...w.entities.values()].filter(n=>n.archetype==='fleet-raider').length,6);
 const visible=[...w.entities.values()].filter(n=>n.archetype==='fleet-raider');
 for(const n of visible){current.fleetCampaign.defeated.r4.push(n.id);w.entities.delete(n.id);}
 assert.equal(createFleetPopulation(w,()=>.37,current),0,'the saved region is fully cleared');
});
test('partially completed legacy R4 wave respects the maximum simultaneous enemy cap',()=>{
 const current=save('r4'),w=world(R4);
 current.fleetCampaign.defeated.r4=Array.from({length:14},(_,i)=>'old-r4-npc-'+i);
 const initial=createFleetPopulation(w,()=>.32,current);
 assert.equal(initial,6);
 const group=[...w.entities.values()].filter(n=>n.archetype==='fleet-raider');
 for(const n of group.slice(0,4)){
  current.fleetCampaign.defeated.r4.push(n.id);w.entities.delete(n.id);
 }
 const newly=createFleetPopulation(w,()=>.32,current);
 assert.equal(newly,4,'two survivors plus four new enemies still total six');
 assert.equal([...w.entities.values()].filter(n=>n.archetype==='fleet-raider').length,6);
});
