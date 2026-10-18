import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {createWorldState} from '../src/world/WorldState.js';
import {R3} from '../src/world/regions/r3.js';
import {collidesWithIsland} from '../src/world/IslandCollision.js';
import {createMonsterPopulation,ensureFleetLeviathan,updateMonsterPopulation} from '../src/monsters/MonsterPopulation.js';
import {fleetProgress,recordFleetDefeat,FLEET_REGIONS} from '../src/missions/FleetCampaign.js';
const makeWorld=(x=420,y=860)=>{const world=createWorldState(R3);
  world.camera.x=x;world.camera.y=y;world.fleetNoRespawn=true;return world;};
test('R3 fleet battle always creates a visible Leviathan close to the ship',()=>{
  const world=makeWorld();
  const monster=ensureFleetLeviathan(world);
  assert.ok(monster);
  assert.equal(monster.id,'r3-leviathan');
  assert.equal(monster.type,'monster');
  assert.equal(monster.ambushPhase,'surface');
  const distance=Math.hypot(monster.x-world.camera.x,monster.y-world.camera.y);
  assert.ok(distance>=300&&distance<=1100,'boss is within encounter range, got '+distance);
  assert.equal(collidesWithIsland(R3,monster.x,monster.y,135),false);
  assert.equal(ensureFleetLeviathan(world),monster,'must not duplicate or teleport every tick');
});
test('Leviathan is created even when its default map spawn is blocked',()=>{
  const world=makeWorld(2800,4300);
  world.region={...R3,islands:[...R3.islands,{id:'mock-blocked-anchor',x:3520,y:3950,width:500,height:500}]};
  assert.equal(createMonsterPopulation(world,()=>.3,{fleetCampaign:{version:1}}),0);
  const boss=ensureFleetLeviathan(world);
  assert.ok(boss,'recovery spawn must not depend on default fixed location');
  assert.equal(collidesWithIsland(world.region,boss.x,boss.y,135),false);
});
test('fleet Leviathan can return from a dormant spawn and retain damage',()=>{
  const world=makeWorld(800,1200);
  createMonsterPopulation(world);
  const dormant=world.entities.get('r3-leviathan');
  world.entities.delete(dormant.id);
  dormant.health=136000;
  world.entities.set(dormant.id,dormant);
  const recovered=ensureFleetLeviathan(world);
  assert.equal(recovered,dormant);
  assert.equal(recovered.health,136000);
  updateMonsterPopulation(world,64);
  assert.ok(recovered.health>0);
});
test('R3 monster victory advances to Terror do Mar, not directly to map 4',()=>{
  const c={version:1,region:3,defeated:{r3:Array.from({length:FLEET_REGIONS.r3.enemyGoal},(_,i)=>'npc-'+i)},
    treasures:{r3:[]},monsters:{},bosses:{r3:[]},preparedRegions:['r3'],treasureGoal:{r3:0}};
  let save={fleetCampaign:c};
  assert.equal(fleetProgress(save,'r3',0).encounter.id,'r3-leviathan');
  const victory=recordFleetDefeat(save,'r3',{id:'r3-leviathan',type:'monster',archetype:'sea-monster-leviathan'});
  assert.ok(victory);
  save={...save,...victory};
  assert.equal(fleetProgress(save,'r3',0).encounter.id,'terror-do-mar');
  assert.equal(fleetProgress(save,'r3',0).complete,false);
});
test('fleet encounter only announces a boss after it exists, with Leviathan spawning fallback and guide',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const begin=main.indexOf('function syncFleetEncounter('),end=main.indexOf('function persistPlayerPosition',begin);
  const block=main.slice(begin,end);
  assert.ok(block.indexOf('boss=ensureFleetLeviathan(world)')>0);
  assert.ok(block.indexOf('if(!boss)return')<block.indexOf("showOceanReward('☠️ '+encounter.name"));
  assert.ok(block.includes("guideMissionTo(boss)"));
});
