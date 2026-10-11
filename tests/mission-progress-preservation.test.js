import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getR4Board,acceptR4Mission,recordR4Event,claimR4Mission} from '../src/missions/RegionFourCampaign.js';
import {R3_FLAME_MISSION_ID,claimR3Mission} from '../src/missions/RegionThreeCampaign.js';
import {canonicalSingleMissionState} from '../src/missions/CampaignState.js';
import {R2_MISSIONS} from '../src/missions/RegionTwoCampaign.js';

const apply=(save,patch)=>({...save,...patch});
const wrecks=['r4-ice-wreck-1','r4-ice-wreck-2','r4-ice-wreck-3','r4-ice-wreck-4','r4-ice-wreck-5'];

test('R4 wrecks collected before accepting cannot soft-lock the first mission',()=>{
 let save={r4CollectedWrecks:[...wrecks],consumables:{quantities:{'area-freeze':2}}};
 const accepted=acceptR4Mission(save,'r4-ice-wreck-investigation');
 assert.ok(accepted);
 save=apply(save,accepted);
 let board=getR4Board(save);
 assert.equal(board.activeRegion,4);
 assert.equal(board.essentialClaimed,0);
 assert.deepEqual(board.active[0].progress,[5,0]);
 assert.equal(recordR4Event(save,{type:'r4-wreck',id:wrecks[0]}),null);
 const delivered=recordR4Event(save,{type:'return-port'});
 assert.ok(delivered);
 save=apply(save,delivered);
 assert.equal(getR4Board(save).claimable[0].id,'r4-ice-wreck-investigation');
 const outcome=claimR4Mission(save,'r4-ice-wreck-investigation');
 assert.ok(outcome);
 save=apply(save,outcome.patch);
 assert.equal(save.consumables.quantities['area-freeze'],7);
 assert.equal(save.r4CollectedWrecks.length,5);
 assert.equal(getR4Board(save).essentialClaimed,1);
 assert.equal(claimR4Mission(save,'r4-ice-wreck-investigation'),null);
 assert.equal(getR4Board(save).available[0].id,'r4-frost-watch');
});

test('R4 guards count unique sink events and Sombra requires the exact entity ID',()=>{
 let save={r4Campaign:{claimed:['r4-ice-wreck-investigation']}};
 assert.equal(acceptR4Mission(save,'r4-shadow-trail'),null);
 save=apply(save,acceptR4Mission(save,'r4-frost-watch'));
 const first={type:'defeat',archetype:'vigia-da-geada',id:'r4-vigias-da-geada-01',defeatId:'r4-vigias-da-geada-01:0'};
 save=apply(save,recordR4Event(save,first));
 assert.equal(recordR4Event(save,first),null);
 save=apply(save,recordR4Event(save,{type:'defeat',archetype:'vigia-da-geada',id:'r4-vigias-da-geada-02',defeatId:'r4-vigias-da-geada-02:0'}));
 save=apply(save,recordR4Event(save,{type:'return-port'}));
 const guardClaim=claimR4Mission(save,'r4-frost-watch');
 assert.ok(guardClaim);
 save=apply(save,guardClaim.patch);
 assert.equal(save.ammunition['frozen-explosion'],300);
 save=apply(save,acceptR4Mission(save,'r4-shadow-trail'));
 assert.equal(recordR4Event(save,{type:'defeat',id:'r4-sombra-do-saque:1712345678',defeatId:'r4-sombra-do-saque:0'}),null);
 const boss=recordR4Event(save,{type:'defeat',id:'r4-sombra-do-saque',defeatId:'r4-sombra-do-saque:0'});
 assert.ok(boss);
 save=apply(save,boss);
 assert.equal(recordR4Event(save,{type:'defeat',id:'r4-sombra-do-saque',defeatId:'r4-sombra-do-saque:0'}),null);
 save=apply(save,recordR4Event(save,{type:'return-port'}));
 const bossClaim=claimR4Mission(save,'r4-shadow-trail');
 assert.ok(bossClaim);
 save=apply(save,bossClaim.patch);
 assert.equal(save.ammunition['frozen-explosion'],800);
 assert.equal(getR4Board(save).essentialClaimed,3);
 assert.equal(claimR4Mission(save,'r4-shadow-trail'),null);
});

test('R3 Flame can be claimed if an older save already has the award receipt',()=>{
 const save={r3Campaign:{active:R3_FLAME_MISSION_ID,claimed:['r3-abyss-secret'],flameStep:6,
   flameReturned:true,varkorFlameUnlocked:true},consumables:{quantities:{'flame-5x':4}}};
 const result=claimR3Mission(save,R3_FLAME_MISSION_ID);
 assert.ok(result);
 assert.equal(result.patch.r3Campaign.claimed.includes(R3_FLAME_MISSION_ID),true);
 assert.equal(result.patch.r3Campaign.varkorFlameUnlocked,true);
 assert.equal(result.patch.consumables,undefined);
 assert.equal(claimR3Mission(apply(save,result.patch),R3_FLAME_MISSION_ID),null);
});

test('claimed history survives additions and removals from the mission catalog',()=>{
 const save=canonicalSingleMissionState({
  claimed:['legacy-r2-mission','r2-thieves','r2-thieves'],active:null
 },R2_MISSIONS);
 assert.deepEqual(save.claimed,['legacy-r2-mission','r2-thieves']);
});

test('startup no longer contains destructive campaign replay or rollback scripts',async()=>{
 const [main,battle]=await Promise.all([
  readFile(new URL('../src/main.js',import.meta.url),'utf8'),
  readFile(new URL('../src/combat/NavalBattleController.js',import.meta.url),'utf8')
 ]);
 assert.doesNotMatch(main,/r3BeforeRebirthHardResetV4|devReplayR1FinaleOnceV4|varkorWreckReplayResetV1|blackMarketRollbackV1/);
 assert.doesNotMatch(main,/claimed:\s*claimed\.filter\(/);
 assert.match(main,/onAccept: id => world\.region\.id === 'r4'/);
 assert.match(main,/defeatId:npc\.id/);
 assert.match(battle,/if\(!target \|\| Number\(target\.health\)<=0\)/);
});
