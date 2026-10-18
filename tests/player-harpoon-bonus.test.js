import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';
import {
  HARPOON_LAUNCHERS, HORIZON_HARPOON_ID, playerHarpoonDamage,
  playerHarpoonReloadMs,
} from '../src/combat/HarpoonCatalog.js';

function createBattle({launcherId,ammo,monsterHealth=10000,fleet=false}={}){
  let now=1000;
  let save={
    fleetCampaign:fleet?{version:1}:undefined,
    equipment:launcherId?{equippedHarpoonId:launcherId,ownedHarpoonIds:[launcherId]}:{},
    harpoonAmmo:ammo,
    combat:{shipHealth:100},
  };
  const monster={id:fleet?'r3-leviathan':'kraken',type:'monster',archetype:'sea-monster-kraken',
    name:'Kraken de teste',health:monsterHealth,maxHealth:monsterHealth,state:'retaliating',
    x:350,y:0,heading:0};
  const shots=[];
  const battle=new NavalBattleController({
    renderer:{prepareAmmo(){},fire(projectile){shots.push(projectile);return true;},getKrakenAttacks(){return [];}},
    readSave:()=>save,writePatch:patch=>{save={...save,...patch}},
    getPlayer:()=>({x:0,y:0}),getEntities:()=>new Map([[monster.id,monster]]),
    shipId:'starter',clock:()=>now,random:()=>.5,
  });
  battle.setTarget(monster.id);
  return {battle,monster,shots,save:()=>save,clock:n=>{now=n}};
}

test('regular player harpoon has double impact damage and half cooldown',()=>{
  const {battle,monster,shots,clock}=createBattle({ammo:{'harpoon-mariner':3}});
  assert.equal(battle.getStatus().harpoonReloadSeconds,3.5);
  assert.equal(battle.fireHarpoon(),true);
  assert.equal(shots[0].onImpact({at:{x:350,y:0}}).kind,'ship');
  assert.equal(monster.health,10000-60);
  clock(4499);
  assert.equal(battle.getHarpoonStatus().ready,false);
  clock(4500);
  assert.equal(battle.getHarpoonStatus().ready,true);
});
test('armor-piercing harpoon doubles the special piercing damage without changing ammo consumption',()=>{
  const {battle,monster,shots,save}=createBattle({ammo:{'harpoon-mariner':3,'harpoon-armor-piercing':2}});
  assert.equal(battle.fireHarpoon(),true);
  assert.equal(shots[0].onImpact({at:{x:350,y:0}}).kind,'ship');
  assert.equal(monster.health,10000-120);
  assert.equal(save().harpoonAmmo['harpoon-armor-piercing'],1);
  assert.equal(save().harpoonAmmo['harpoon-mariner'],3);
});
test('fleet Leviathan uses double specialized harpoon damage and half reload',()=>{
  const {battle,monster,shots,clock}=createBattle({
    launcherId:HORIZON_HARPOON_ID,ammo:{'harpoon-horizon-incendiary':3},
    monsterHealth:250000,fleet:true,
  });
  assert.equal(battle.getStatus().harpoonReloadSeconds,.65);
  assert.equal(battle.fireHarpoon(),true);
  assert.equal(shots[0].onImpact({at:{x:350,y:0}}).kind,'ship');
  assert.equal(monster.health,250000-6400);
  clock(1649);
  assert.equal(battle.getHarpoonStatus().ready,false);
  clock(1650);
  assert.equal(battle.getHarpoonStatus().ready,true);
});
test('assist button is absent and launcher base definitions are unchanged',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.doesNotMatch(main,/monster-assist-button|assistButton/);
  assert.equal(HARPOON_LAUNCHERS[0].reloadSeconds,7);
  assert.equal(HARPOON_LAUNCHERS[0].baseDamage,30);
  assert.equal(playerHarpoonDamage(30),60);
  assert.equal(playerHarpoonReloadMs(7),3500);
});
