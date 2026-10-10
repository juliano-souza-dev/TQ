import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldState} from '../src/world/WorldState.js';
import {R3} from '../src/world/regions/r3.js';
import {
  updateDarkWatersFleet,
  EMERALD_GHOST_LEVIATHAN_DAMAGE,
  EMERALD_GHOST_LEVIATHAN_RELOAD_MS,
  EMERALD_GHOST_LEVIATHAN_RANGE,
} from '../src/npcs/DarkWatersFleet.js';
import {NavalBattleController} from '../src/combat/NavalBattleController.js';

function setUp({found=true,active='r3-leviathan-hunt',health=250000,phase='surface'}={}){
  const leviathan={
    id:'r3-leviathan',name:'Leviathan',type:'monster',
    archetype:'sea-monster-leviathan',x:3000,y:3550,
    health,maxHealth:250000,heading:0,ambushPhase:phase,state:'retaliating',
  };
  const ghost={
    id:'r3-fantasma-esmeralda',name:'Fantasma Esmeralda',type:'npc',
    archetype:'emerald-ghost',x:2550,y:3550,heading:90,
    health:90000,maxHealth:90000,baseSpeed:210,roamRadius:620,
    home:{x:2550,y:3550},leviathanHuntActive:true,
  };
  const entities=new Map([[leviathan.id,leviathan],[ghost.id,ghost]]);
  let save={r3Campaign:{active,leviathanFound:found,leviathanDefeated:false},equipment:{ownedHarpoonIds:['harpoon-horizon-eye-launcher'],equippedHarpoonId:'harpoon-horizon-eye-launcher'},ammunition:{}};
  const shots=[],victories=[],visuals=[];
  const renderer={prepareAmmo(){},fire(shot){shots.push(shot);return true;}};
  const controller=new NavalBattleController({
    renderer,readSave:()=>save,writePatch:p=>{save={...save,...p}},
    getRegionId:()=> 'r3',getEntities:()=>entities,
    getPlayer:()=>({x:2750,y:3550}),shipId:'starter',
    onVictory:target=>victories.push(target.id),
    onDamageVisual:hit=>visuals.push(hit),
    clock:()=>3000,
  });
  return {controller,entities,leviathan,ghost,shots,victories,visuals,getSave:()=>save,setSave:s=>{save=s}};
}

test('Fantasma Esmeralda uses the equipped Horizon harpoon with its real 400 damage every 2 seconds',()=>{
  assert.equal(EMERALD_GHOST_LEVIATHAN_DAMAGE,250);
  assert.equal(EMERALD_GHOST_LEVIATHAN_RELOAD_MS,2000);
  assert.equal(EMERALD_GHOST_LEVIATHAN_RANGE,760);
  const t=setUp();
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),true);
  assert.equal(t.controller.fireEmeraldGhostLeviathan(2999),false);
  assert.equal(t.shots.length,1);
  assert.equal(t.shots[0].ammo.id,'naval-harpoon-horizon');
  assert.deepEqual(t.shots[0].from,{x:t.ghost.x,y:t.ghost.y});
  assert.equal(t.leviathan.health,250000,'damage only at impact, not launch');
  assert.equal(t.shots[0].onImpact({at:{x:t.leviathan.x,y:t.leviathan.y}}).kind,'ship');
  assert.equal(t.leviathan.health,249600);
  assert.equal(t.visuals[0].source,'npc');
  assert.equal(t.visuals[0].damage,400);
  assert.equal(t.controller.fireEmeraldGhostLeviathan(3000),true);
  assert.equal(t.shots.length,2);
  assert.equal(t.shots[1].onImpact({at:{x:t.leviathan.x,y:t.leviathan.y}}).kind,'ship');
  assert.equal(t.leviathan.health,249200);
});

test('ghost follows the hunt physically and returns to regular spectral patrol outside mission',()=>{
  const world=createWorldState(R3);
  world.camera.x=2850;world.camera.y=3450;
  const t=setUp();
  world.entities=t.entities;
  t.ghost.x=2300;t.ghost.y=3450;
  const oldDist=Math.hypot(t.ghost.x-t.leviathan.x,t.ghost.y-t.leviathan.y);
  updateDarkWatersFleet(world,64,()=>.5);
  const newDist=Math.hypot(t.ghost.x-t.leviathan.x,t.ghost.y-t.leviathan.y);
  assert.equal(t.ghost.state,'leviathan-ally');
  assert.ok(newDist<oldDist,'ghost moves toward the live leviathan without teleporting');
  assert.ok(oldDist-newDist<30,'physical movement is speed-limited per tick');
  t.ghost.leviathanHuntActive=false;
  updateDarkWatersFleet(world,64,()=>.5);
  assert.equal(t.ghost.state,'spectral-roam');
});

test('ally stays harmless outside the quest or before the monster is found',()=>{
  for(const opts of [{active:null},{active:'r3-silas-pact'},{found:false}]){
    const t=setUp(opts);
    assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),false);
    assert.equal(t.shots.length,0);
  }
  const t=setUp();
  t.ghost.leviathanHuntActive=false;
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),false);
  t.ghost.leviathanHuntActive=true;
  t.ghost.x=1500;
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),false,'must be within firing range');
});

test('submerged Leviathan cannot be hit by ghost projectiles',()=>{
  const t=setUp({phase:'submerged'});
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),false);
  t.leviathan.ambushPhase='surface';
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),true);
  t.leviathan.ambushPhase='diving';
  assert.equal(t.shots[0].onImpact({at:{x:t.leviathan.x,y:t.leviathan.y}}).kind,'water');
  assert.equal(t.leviathan.health,250000);
  assert.equal(t.visuals.length,0);
});

test('ghost killing blow registers a single real combat victory',()=>{
  const t=setUp({health:400});
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),true);
  assert.equal(t.shots[0].onImpact({at:{x:t.leviathan.x,y:t.leviathan.y}}).kind,'ship');
  assert.equal(t.leviathan.health,0);
  assert.deepEqual(t.victories,['r3-leviathan']);
  assert.equal(t.controller.fireEmeraldGhostLeviathan(3000),false);
  assert.equal(t.shots[0].onImpact({at:{x:t.leviathan.x,y:t.leviathan.y}}).kind,'water');
  assert.deepEqual(t.victories,['r3-leviathan']);
});

test('projectile rejection does not trigger cooldown or damage',()=>{
  const t=setUp();
  t.controller.renderer.fire=()=>false;
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),false);
  assert.equal(t.leviathan.health,250000);
  t.controller.renderer.fire=shot=>{t.shots.push(shot);return true};
  assert.equal(t.controller.fireEmeraldGhostLeviathan(1000),true);
  assert.equal(t.shots.length,1);
});

test('the active game loop wires real mission state and independent combat cooldown',async()=>{
  const fs=await import('node:fs/promises');
  const main=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8');
  const controller=await fs.readFile(new URL('../src/combat/NavalBattleController.js',import.meta.url),'utf8');
  assert.match(main,/ghost\.leviathanHuntActive=/);
  assert.match(controller,/this\.fireEmeraldGhostLeviathan\(now\)/);
  assert.match(controller,/this\.nextNpcShot\.set\(key,now\+EMERALD_GHOST_LEVIATHAN_RELOAD_MS\)/);
});
