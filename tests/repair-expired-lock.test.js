import test from 'node:test';
import assert from 'node:assert/strict';
import { accumulateHullRepair,advanceHullRecovery,getMaxHullHealth } from '../src/combat/HullRepair.js';
import { resolvePedagogicalAction } from '../src/gameplay/PedagogicalActions.js';

const challenge=(id)=>({id,region:3,family:3,factor:4,a:3,b:4,answer:12});
function saveAtHealth(health=1920) {
 return {fleetCampaign:{version:1,region:3},
  equipment:{equippedShipId:'fantasma-esmeralda'},
  combat:{shipHealth:health},pedagogy:{},consumables:{quantities:{'flame-5x':3}}};
}
test('expired repair lock does not reject a new repair on a damaged 2400-HP fleet hull',()=>{
 const now=Date.now(),save=saveAtHealth();
 save.combat.repairingUntil=now-5000;
 const first=accumulateHullRepair(save,now);
 assert.ok(first?.patch,'expired repair lock should not block a new repair');
 assert.equal(first.patch.combat.repairingFrom,1920);
 assert.equal(first.patch.combat.repairingTo,2400);
 assert.ok(first.patch.combat.repairingUntil>now);
});
test('solved math question starts recovery even with a leftover expired repair flag',()=>{
 const save=saveAtHealth();
 save.combat.repairingUntil=Date.now()-8000;
 const solved=resolvePedagogicalAction(save,{kind:'repair'},challenge('repair-expired-lock'),true);
 assert.ok(solved?.patch?.combat?.repairingUntil>Date.now());
 assert.equal(solved.patch.combat.repairingFrom,1920,'stale save cannot erase existing HP');
 assert.equal(solved.patch.pedagogy.region3.answeredIds.length,1);
});
test('correct answer while recovery already running is accepted and never starts a second timer',()=>{
 const save=saveAtHealth();
 const initial=accumulateHullRepair(save);
 save.combat=initial.patch.combat;
 const originalEnd=save.combat.repairingUntil;
 const solved=resolvePedagogicalAction(save,{kind:'repair'},challenge('repair-already-running'),true);
 assert.ok(solved,'correct answer must not be rejected');
 assert.match(solved.message,/em andamento/);
 assert.equal(solved.patch.combat,undefined);
 assert.equal(save.combat.repairingUntil,originalEnd);
 assert.equal(solved.patch.pedagogy.region3.answeredIds.length,1);
});
test('correct answer when repair completed during the gate is accepted and clears stale timer',()=>{
 const save=saveAtHealth();
 save.combat={shipHealth:1920,repairingFrom:1920,
  repairingStartedAt:Date.now()-5000,repairingUntil:Date.now()-3000};
 const solved=resolvePedagogicalAction(save,{kind:'repair'},challenge('repair-completed-during-question'),true);
 assert.ok(solved);
 assert.match(solved.message,/totalmente reparado/);
 assert.equal(solved.patch.combat.shipHealth,getMaxHullHealth(save));
 assert.equal(solved.patch.combat.repairingUntil,null);
});
test('repair at full hull accepts educational success but does not change HP',()=>{
 const save=saveAtHealth(2400);
 const solved=resolvePedagogicalAction(save,{kind:'repair'},challenge('full-hull-during-question'),true);
 assert.ok(solved);
 assert.match(solved.message,/totalmente reparado/);
 assert.equal(solved.patch.combat,undefined);
 assert.equal(solved.patch.pedagogy.region3.answeredIds.length,1);
});
test('orphaned expired repair timestamp cannot roll the hull back to zero',()=>{
 const save=saveAtHealth(1920);
 save.combat.repairingUntil=Date.now()-5000;
 const settled=advanceHullRecovery(save);
 assert.equal(settled.combat.shipHealth,1920);
 assert.equal(settled.combat.repairingUntil,null);
});
