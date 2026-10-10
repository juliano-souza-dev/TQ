import test from 'node:test';
import assert from 'node:assert/strict';
import { R3 } from '../src/world/regions/r3.js';
import { createWorldState } from '../src/world/WorldState.js';
import { createMonsterPopulation, updateMonsterPopulation } from '../src/monsters/MonsterPopulation.js';
import {
  R3_LEVIATHAN_MISSION_ID, R3_LEVIATHAN_ENTITY_ID,
  R3_MISSIONS, getR3Board, acceptR3Mission, recordR3Event, claimR3Mission,
} from '../src/missions/RegionThreeCampaign.js';
import {
  R3_SILAS_MISSION_ID, R3_SILAS_REWARD,
  exchangeR3SilasCargo, silasReceivedLoadout, reconcileSilasAutomaticLoadout,
} from '../src/missions/R3SilasTrade.js';

const silasClaimed=()=>({
  r3Campaign:{
    claimed:['r3-equip-golden','r3-dark-waters-warning',R3_SILAS_MISSION_ID],
    silasTradeCompleted:true,active:null,
  },
});

test('Leviathan is a real Region 3 monster with 250,000 HP and retains dive mechanics',()=>{
  const world=createWorldState(R3);
  assert.equal(createMonsterPopulation(world),1);
  const leviathan=world.entities.get(R3_LEVIATHAN_ENTITY_ID);
  assert.equal(leviathan.type,'monster');
  assert.equal(leviathan.archetype,'sea-monster-leviathan');
  assert.equal(leviathan.health,250000);
  assert.equal(leviathan.maxHealth,250000);
  assert.equal(leviathan.ambushPhase,'surface');
  assert.equal(leviathan.attackDamage,50000);
  leviathan.health=0;
  updateMonsterPopulation(world,1);
  updateMonsterPopulation(world,60000);
  assert.equal(leviathan.health,250000);
});

test('Leviathan Hunt unlocks only after Silas has been claimed and stays sequential',()=>{
  assert.equal(R3_MISSIONS.length,4);
  assert.equal(R3_MISSIONS[3].id,R3_LEVIATHAN_MISSION_ID);
  assert.equal(R3_MISSIONS[3].name,'Caça ao Leviathan');
  const before={r3Campaign:{claimed:['r3-equip-golden','r3-dark-waters-warning'],active:null}};
  assert.equal(getR3Board(before).missions[3].status,'locked');
  assert.equal(acceptR3Mission(before,R3_LEVIATHAN_MISSION_ID),null);
  const after=silasClaimed();
  assert.equal(getR3Board(after).missions[3].status,'available');
  const patch=acceptR3Mission(after,R3_LEVIATHAN_MISSION_ID);
  assert.ok(patch);
  assert.equal(patch.r3Campaign.active,R3_LEVIATHAN_MISSION_ID);
  assert.equal(getR3Board({...after,...patch}).missions[3].status,'active');
  assert.equal(acceptR3Mission({...after,...patch},R3_LEVIATHAN_MISSION_ID),null);
});

test('Hunt requires find, defeat, then a real visit to port, with exactly one claim',()=>{
  const initial=silasClaimed();
  let save={...initial,...acceptR3Mission(initial,R3_LEVIATHAN_MISSION_ID)};
  const event=e=>{const patch=recordR3Event(save,e);if(patch)save={...save,...patch};return patch;};
  assert.equal(event({type:'leviathan-defeated',id:R3_LEVIATHAN_ENTITY_ID}),null);
  assert.equal(event({type:'return-port',id:'r3-leviathan-return'}),null);
  assert.equal(event({type:'leviathan-found',id:'r3-some-other-monster'}),null);
  assert.ok(event({type:'leviathan-found',id:R3_LEVIATHAN_ENTITY_ID}));
  assert.equal(event({type:'leviathan-found',id:R3_LEVIATHAN_ENTITY_ID}),null);
  assert.equal(getR3Board(save).missions[3].progress[0],1);
  assert.ok(event({type:'leviathan-defeated',id:R3_LEVIATHAN_ENTITY_ID}));
  assert.equal(event({type:'leviathan-defeated',id:R3_LEVIATHAN_ENTITY_ID}),null);
  assert.deepEqual(getR3Board(save).missions[3].progress,[1,1,0]);
  assert.equal(claimR3Mission(save,R3_LEVIATHAN_MISSION_ID),null);
  assert.equal(getR3Board(save).missions[3].status,'active');
  assert.ok(event({type:'return-port',id:'r3-leviathan-return'}));
  assert.equal(event({type:'return-port',id:'r3-leviathan-return'}),null);
  assert.equal(getR3Board(save).missions[3].status,'ready');
  assert.deepEqual(getR3Board(save).missions[3].progress,[1,1,1]);
  const outcome=claimR3Mission(save,R3_LEVIATHAN_MISSION_ID);
  assert.equal(outcome.mission.reward.story,'Uma pista sobre o Coração do Abismo');
  assert.equal(outcome.patch.equipment,undefined);
  assert.equal(outcome.patch.consumables,undefined);
  save={...save,...outcome.patch};
  assert.equal(getR3Board(save).missions[3].status,'claimed');
  assert.equal(getR3Board(save).essentialClaimed,4);
  assert.equal(claimR3Mission(save,R3_LEVIATHAN_MISSION_ID),null);
  assert.equal(recordR3Event(save,{type:'leviathan-found',id:R3_LEVIATHAN_ENTITY_ID}),null);
});

test('Silas equips two Aetherions and fills remaining real ship slots with Terror cannons',()=>{
  const equipment={
    equippedShipId:'galeao-dourado',ownedShipIds:['galeao-dourado'],
    cannonCounts:{'royal-lion':2},ownedCannonIds:['royal-lion'],
    loadout:{'galeao-dourado':['royal-lion'],'starter':['royal-lion']},
    ownedHarpoonIds:['naval-harpoon-starter'],equippedHarpoonId:'naval-harpoon-starter',
  };
  const save={
    r3Campaign:{active:R3_SILAS_MISSION_ID,claimed:['r3-equip-golden','r3-dark-waters-warning']},
    equipment,ammunition:{'rusted-iron':30},
    consumables:{quantities:{shield:2}},
  };
  assert.deepEqual(silasReceivedLoadout(save),['aetherion-mk1','aetherion-mk1',...Array(5).fill('pumpkin-terror')]);
  const trade=exchangeR3SilasCargo(save);
  assert.ok(trade);
  assert.deepEqual(trade.equipment.loadout['galeao-dourado'],
    ['aetherion-mk1','aetherion-mk1',...Array(5).fill('pumpkin-terror')]);
  assert.deepEqual(trade.equipment.loadout.starter,[]);
  assert.equal(trade.equipment.equippedShipId,'galeao-dourado');
  assert.deepEqual(trade.equipment.cannonCounts,R3_SILAS_REWARD.cannons);
  assert.equal(trade.equipment.equippedHarpoonId,'harpoon-horizon-eye-launcher');
  assert.equal(trade.r3Campaign.silasLoadoutReconciled,true);
  assert.equal(trade.r3Campaign.silasHoldings.cannonCounts['royal-lion'],2);
  assert.equal(trade.r3Campaign.silasHoldings.loadout['galeao-dourado'][0],'royal-lion');
  assert.equal(exchangeR3SilasCargo({...save,...trade}),null);
  assert.equal(reconcileSilasAutomaticLoadout({...save,...trade}),null);
  const upgrade={...save,shipUpgrades:{masterShipwright:true}};
  assert.equal(silasReceivedLoadout(upgrade).length,12);
  assert.equal(silasReceivedLoadout(upgrade).filter(id=>id==='aetherion-mk1').length,2);
  assert.equal(silasReceivedLoadout(upgrade).filter(id=>id==='pumpkin-terror').length,10);
});

test('old traded saves receive one-time loadout repair without overriding manual batteries',()=>{
  const base={
    r3Campaign:{silasTradeCompleted:true,claimed:['r3-equip-golden','r3-dark-waters-warning',R3_SILAS_MISSION_ID]},
    equipment:{
      equippedShipId:'galeao-dourado',
      cannonCounts:{...R3_SILAS_REWARD.cannons},
      ownedCannonIds:Object.keys(R3_SILAS_REWARD.cannons),
      loadout:{'galeao-dourado':[]},
    },
  };
  const repair=reconcileSilasAutomaticLoadout(base);
  assert.deepEqual(repair.equipment.loadout['galeao-dourado'],
    ['aetherion-mk1','aetherion-mk1',...Array(5).fill('pumpkin-terror')]);
  assert.equal(repair.r3Campaign.silasLoadoutReconciled,true);
  assert.equal(reconcileSilasAutomaticLoadout({...base,...repair}),null);
  const manual={...base,equipment:{...base.equipment,
    loadout:{'galeao-dourado':['pumpkin-terror']}}};
  const untouched=reconcileSilasAutomaticLoadout(manual);
  assert.equal(untouched.equipment,undefined);
  assert.equal(untouched.r3Campaign.silasLoadoutReconciled,true);
});

test('gameplay wires mission acceptance, live guided target, victory and port return',async()=>{
  const fs=await import('node:fs/promises');
  const source=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(source,/leviathan-found/);
  assert.match(source,/leviathan-defeated/);
  assert.match(source,/R3_LEVIATHAN_MISSION_ID/);
  assert.match(source,/guideMissionTo\(leviathan\)/);
  assert.match(source,/recordMissionEvent\(\{type:'return-port',id:'r3-leviathan-return'\}\)/);
});
