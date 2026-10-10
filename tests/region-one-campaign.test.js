import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRegionMastery, recordRegionChallenge, chooseRegionChallenge,
  buildMultipleChoiceAnswers, REGION_FAMILIES,
} from '../src/education/RegionMastery.js';
import {
  R1_MISSIONS, getCampaignBoard, acceptCampaignMission,
  recordCampaignEvent, claimCampaignMission, startRegion2,
} from '../src/missions/RegionOneCampaign.js';
import { resolvePedagogicalAction } from '../src/gameplay/PedagogicalActions.js';
import { repairHull, accumulateHullRepair, beginHullRecovery, advanceHullRecovery } from '../src/combat/HullRepair.js';
import {
  REGION_ONE_TREASURES, ALL_R1_TREASURES, TREASURE_RESPAWN_MS, getVisibleTreasures, claimTreasure,
} from '../src/treasures/RegionTreasures.js';

const initial = () => ({
  missions: { corsair: 'complete' },
  profile: { gold: 10 },
  ammunition: { 'rusted-iron': 20 },
  equipment: { loadout: { starter: ['blue-gold-pirate'] } },
  combat: { shipHealth: 40 },
  campaign: { active: [], claimed: [], progress: {} },
  progression: { unlockedRegion: 1, activeRegion: 1 },
});

function challenge(family = 2, factor = 1, id = 'math-' + (++challenge.seq)) {
  return { id, region: 1, family, factor, a: family, b: factor, answer: family * factor };
}
challenge.seq = 0;
const apply = (save, patch) => ({ ...save, ...patch });

test('R1 teaches only factors 2, 5 and 10, with 75% minimum clean responses', () => {
  assert.deepEqual(REGION_FAMILIES[1], [2, 5, 10]);
  assert.deepEqual(REGION_FAMILIES[2], [2, 3, 5, 10]);
  let pedagogy = {};
  for (let factor = 1; factor <= 10; factor++) {
    pedagogy = recordRegionChallenge(pedagogy, challenge(2, factor), factor <= 7).progress;
  }
  const stats = getRegionMastery(pedagogy).families.find(item => item.family === 2);
  assert.equal(stats.distinct, 10);
  assert.equal(stats.accuracy, .7);
  assert.equal(stats.mastered, false);
  pedagogy = recordRegionChallenge(pedagogy, challenge(2, 1), true).progress;
  pedagogy = recordRegionChallenge(pedagogy, challenge(2, 2), true).progress;
  assert.equal(getRegionMastery(pedagogy).families.find(item => item.family === 2).mastered, true);
});

test('quiz is always four different positive choices and the answer is included', () => {
  for (const answer of [2, 10, 20, 50, 100]) {
    const choices = buildMultipleChoiceAnswers(answer, () => .4);
    assert.equal(choices.length, 4);
    assert.equal(new Set(choices).size, 4);
    assert.ok(choices.every(value => value > 0));
    assert.ok(choices.includes(answer));
  }
});

test('accepting a mission requires a completed pedagogical action', () => {
  let save = initial();
  const accepted = resolvePedagogicalAction(save, { kind: 'accept-mission', id: 'r1-patrol' }, challenge(), true);
  assert.ok(accepted);
  save = apply(save, accepted.patch);
  assert.equal(getCampaignBoard(save).missions.find(m => m.id === 'r1-patrol').status, 'active');
  assert.equal(resolvePedagogicalAction(save, { kind: 'accept-mission', id: 'r1-patrol' }, challenge(), true), null);
});

test('treasure grants inventory only once, and answers are recorded for mastery', () => {
  let save = initial();
  const id = REGION_ONE_TREASURES[0].id;
  const result = resolvePedagogicalAction(save, { kind: 'treasure', id }, challenge(5, 3), true);
  assert.ok(result);
  assert.equal(save.profile.gold, 10, 'the input snapshot must not be mutated');
  save = apply(save, result.patch);
  assert.equal(getVisibleTreasures(save).some(t => t.id === id), false);
  assert.ok(save.profile.gold > 10);
  assert.ok(save.ammunition['rusted-iron'] > 20);
  assert.equal(getRegionMastery(save.pedagogy).families.find(f => f.family === 5).attempts, 1);
  assert.equal(claimTreasure(save, id), null, 'the same chest must never pay twice');
  assert.equal(resolvePedagogicalAction(save, { kind: 'treasure', id }, challenge(5, 3), true), null);
});

test('voluntary repair accumulates points and heals over ten seconds after leaving', () => {
  let save = initial();
  const result = resolvePedagogicalAction(save, { kind: 'repair' }, challenge(10, 7), true);
  assert.ok(result);
  save = apply(save, result.patch);
  assert.equal(save.combat.shipHealth, 40, 'math never restores life immediately');
  assert.equal(save.combat.repairPending, 20);
  save = apply(save, beginHullRecovery(save, 1000));
  assert.equal(save.combat.shipHealth, 40);
  save = apply(save, advanceHullRecovery(save, 6000));
  assert.equal(save.combat.shipHealth, 50);
  save = apply(save, advanceHullRecovery(save, 11000));
  assert.equal(save.combat.shipHealth, 60);
  assert.equal(save.combat.repairingUntil, null);
});

test('a sunk ship must earn 100 repair points before recovering', () => {
  let save = { ...initial(), combat: { shipHealth: 0 } };
  for (let i = 0; i < 4; i++) {
    save = apply(save, accumulateHullRepair(save, true).patch);
    assert.equal(beginHullRecovery(save, 1000), null);
  }
  save = apply(save, accumulateHullRepair(save, true).patch);
  assert.equal(save.combat.repairPending, 100);
  save = apply(save, beginHullRecovery(save, 1000));
  assert.equal(save.combat.shipHealth, 0);
  save = apply(save, advanceHullRecovery(save, 11000));
  assert.equal(save.combat.shipHealth, 100);
});

test('victories, navigation and visits apply only to active missions', () => {
  let save = initial();
  assert.equal(recordCampaignEvent(save, { type: 'defeat', archetype: 'red-sail-corsair', id: 'A' }), null);
  save = apply(save, acceptCampaignMission(save, 'r1-patrol'));
  save = apply(save, recordCampaignEvent(save, { type: 'defeat', archetype: 'red-sail-corsair', id: 'A' }));
  assert.equal(recordCampaignEvent(save, { type: 'defeat', archetype: 'red-sail-corsair', id: 'A' }), null);
  save = apply(save, recordCampaignEvent(save, { type: 'defeat', archetype: 'red-sail-corsair', id: 'B' }));
  assert.equal(getCampaignBoard(save).missions.find(m => m.id === 'r1-patrol').status, 'ready');
  const reward = claimCampaignMission(save, 'r1-patrol');
  assert.ok(reward);
  save = apply(save, reward.patch);
  assert.equal(claimCampaignMission(save, 'r1-patrol'), null);
  assert.equal(save.campaign.claimed.filter(id => id === 'r1-patrol').length, 1);
});

test('completing all core missions is insufficient without mastery', () => {
  const save = initial();
  save.campaign.claimed = R1_MISSIONS.filter(m => !m.optional).map(m => m.id);
  assert.equal(getCampaignBoard(save).canAdvance, false);
  assert.equal(startRegion2(save), null);
});

test('stage 2 unlock requires finale plus mastery of all R1 families', () => {
  let save = initial();
  save.campaign.claimed = R1_MISSIONS.filter(m => !m.optional).map(m => m.id);
  for (const family of REGION_FAMILIES[1]) {
    for (let factor = 1; factor <= 10; factor++) {
      const next = recordRegionChallenge(save.pedagogy, challenge(family, factor), factor <= 8);
      save.pedagogy = next.progress;
    }
  }
  const board = getCampaignBoard(save);
  assert.equal(board.mastery.mastered, true);
  assert.equal(board.canAdvance, true);
  assert.deepEqual(startRegion2(save).progression, { unlockedRegion: 2, activeRegion: 2 });
});

test('stage 2 questions include family 3 without resetting R1 mastery', () => {
  const question = chooseRegionChallenge({}, 3, () => .25, 2);
  assert.equal(question.family, 3);
  assert.equal(question.region, 2);
  let progress = recordRegionChallenge({}, question, true).progress;
  assert.equal(getRegionMastery(progress, 2).families.find(f => f.family === 3).attempts, 1);
  assert.equal(getRegionMastery(progress, 1).families.find(f => f.family === 3), undefined);
});

test('mission 13 is Para o Estaleiro, grants 1000 basic balls only after equipping Terror da Tabuada', () => {
  assert.equal(R1_MISSIONS[12].id, 'r1-equip-roses');
  const predecessors = R1_MISSIONS.slice(0,12).map(m => m.id);
  let save = initial();
  save.campaign.claimed = predecessors;
  save.equipment = { ...save.equipment, ownedShipIds:['galeao-halloween-tabuada'] };
  save = apply(save, acceptCampaignMission(save,'r1-equip-roses'));
  assert.equal(getCampaignBoard(save).missions[12].ready,false);
  assert.equal(recordCampaignEvent(save,{type:'equip-ship',ship:'starter'}),null);
  assert.equal(claimCampaignMission(save,'r1-equip-roses'),null);
  save.equipment.equippedShipId = 'galeao-halloween-tabuada';
  save = apply(save, recordCampaignEvent(save,{type:'equip-ship',ship:'galeao-halloween-tabuada'}));
  assert.equal(getCampaignBoard(save).missions[12].ready,true);
  const award = claimCampaignMission(save,'r1-equip-roses');
  assert.equal(award.patch.ammunition['rusted-iron'],1020);
  save = apply(save, award.patch);
  assert.equal(claimCampaignMission(save,'r1-equip-roses'),null);
});

test('Hora da Caça é a missão 11, recompensa mil munições e exige Kraken derrotado', () => {
  assert.equal(R1_MISSIONS[10].id, 'r1-kraken-hunt');
  assert.equal(R1_MISSIONS.filter(m => !m.optional).length, 16);
  assert.ok(R1_MISSIONS.every(m => m.description.length > 90), 'cada missão recebe narrativa');
  let save = initial();
  save.campaign.claimed = R1_MISSIONS.slice(0, 10).map(m => m.id);
  const accepted = acceptCampaignMission(save, 'r1-kraken-hunt');
  assert.ok(accepted);
  save = apply(save, accepted);
  assert.equal(recordCampaignEvent(save, { type:'defeat', archetype:'red-sail-corsair', id:'other' }), null);
  const progress = recordCampaignEvent(save, { type:'defeat', archetype:'sea-monster-kraken', id:'kraken-1' });
  assert.ok(progress);
  save = apply(save, progress);
  const reward = claimCampaignMission(save, 'r1-kraken-hunt');
  assert.ok(reward);
  assert.equal(reward.patch.ammunition['rusted-iron'], 1020);
});

test('A Negociação, o Golpe encerra a campanha com cinco respostas e roubo único', () => {
  assert.equal(R1_MISSIONS.at(-2).id,'r1-finale');
  assert.equal(R1_MISSIONS.at(-3).id,'r1-negotiation');
  let save = initial();
  save.campaign.claimed = R1_MISSIONS.filter(m => !m.optional && m.id !== 'r1-negotiation' && m.id !== 'r1-finale').map(m=>m.id);
  save.profile.gold = 9999;
  save.equipment = {
    ...save.equipment, ownedCannonIds:['blue-gold-pirate','royal-lion'],
    cannonCounts:{'blue-gold-pirate':3,'royal-lion':2},
    loadout:{starter:['blue-gold-pirate','royal-lion','royal-lion']},
  };
  const started=acceptCampaignMission(save,'r1-negotiation');
  assert.ok(started);
  save=apply(save,started);
  for(let i=1;i<=5;i++){
    const result=resolvePedagogicalAction(save,{kind:'negotiation'},challenge(2,i),true);
    assert.ok(result);
    save=apply(save,result.patch);
    assert.equal(save.campaign.progress['r1-negotiation'][0],i);
    if(i<5)assert.equal(save.profile.gold,9999);
  }
  assert.equal(save.profile.gold,0);
  assert.deepEqual(save.equipment.ownedCannonIds,['royal-lion']);
  assert.equal(save.equipment.cannonCounts['royal-lion'],2);
  assert.deepEqual(save.equipment.loadout.starter,[null,'royal-lion','royal-lion']);
  assert.equal(resolvePedagogicalAction(save,{kind:'negotiation'},challenge(2,8),true),null);
  assert.equal(getCampaignBoard(save).missions.find(m=>m.id==='r1-negotiation').status,'ready');
});

test('72 tesouros ficam disponíveis, reaparecem individualmente e não duplicam recompensas', () => {
  assert.equal(ALL_R1_TREASURES.length,72);
  assert.equal(getVisibleTreasures({},1000000).length,72);
  const first=ALL_R1_TREASURES[0];
  const collected=claimTreasure(initial(),first.id,1000000);
  assert.ok(collected);
  const save=apply(initial(),collected.patch);
  assert.equal(getVisibleTreasures(save,1000001).length,71);
  assert.equal(claimTreasure(save,first.id,1000001),null);
  assert.equal(getVisibleTreasures(save,1000000+TREASURE_RESPAWN_MS).length,72);
  const respawn=getVisibleTreasures(save,1000000+TREASURE_RESPAWN_MS).find(t=>t.x===first.x&&t.y===first.y);
  assert.equal(respawn.id,first.id+'-cycle-1');
  assert.ok(claimTreasure(save,respawn.id,1000000+TREASURE_RESPAWN_MS));
});

test('respawn usa ID inédito mesmo após histórico antigo ou sincronização parcial', () => {
  const base = ALL_R1_TREASURES[0].id;
  const oldSave = {
    ...initial(), openedTreasures: [base, base + '-cycle-1', base + '-cycle-2'],
    treasureClaimCounts: { [base]: 1 },
  };
  const visible = getVisibleTreasures(oldSave, 1_000_000);
  assert.equal(visible.find(t => t.x === ALL_R1_TREASURES[0].x).id, base + '-cycle-3');
  assert.equal(claimTreasure(oldSave,base + '-cycle-2',1_000_000),null);
  const result = claimTreasure(oldSave,base + '-cycle-3',1_000_000);
  assert.ok(result);
  const next = { ...oldSave, ...result.patch };
  assert.equal(getVisibleTreasures(next,1_000_001).some(t=>t.x===ALL_R1_TREASURES[0].x),false);
  assert.equal(getVisibleTreasures(next,1_000_000 + TREASURE_RESPAWN_MS)
    .find(t=>t.x===ALL_R1_TREASURES[0].x).id,base + '-cycle-4');
});


test('estado R1 contraditório não mantém missão claimed também como ativa', () => {
  const save=initial();
  save.campaign={active:['r1-patrol'],claimed:['r1-patrol','r1-patrol'],progress:{'r1-patrol':[2]},processedEvents:[]};
  const board=getCampaignBoard(save);
  const mission=board.missions.find(m=>m.id==='r1-patrol');
  assert.equal(mission.status,'claimed');
  assert.equal(mission.active,false);
  assert.equal(board.active.length,0);
  assert.equal(board.essentialClaimed,1);
});

test('deduplicação de evento R1 é por missão e não bloqueia contrato futuro', () => {
  let save=initial();
  save.campaign={active:['r1-patrol'],claimed:[],progress:{'r1-patrol':[0]},processedEvents:[]};
  const first=recordCampaignEvent(save,{type:'defeat',archetype:'red-sail-corsair',id:'corsair-shared'});
  assert.ok(first);
  assert.match(first.campaign.processedEvents[0],/^r1-patrol:defeat:/);
});


test('Artilharia Renovada usa nomes literais e guia ao Estaleiro', async () => {
  const mission=R1_MISSIONS.find(m=>m.id==='r1-shipyard-upgrade');
  assert.match(mission.description,/Canhão Pirata Ornamentado em Azul e Ouro/);
  assert.match(mission.description,/Canhão Real Dourado com Leão/);
  assert.match(mission.objectives[0].label,/Canhão Pirata Ornamentado em Azul e Ouro/);
  assert.match(mission.objectives[0].label,/Canhão Real Dourado com Leão/);
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source,/r1-shipyard-upgrade','r1-equip-roses/);
  assert.match(source,/guideMissionTo\('shipyard'\)/);
});


test('missão de equipar navio é concluída no próprio porto quando o navio já está equipado', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source,/function resolveAlreadyEquippedShipMission/);
  assert.match(source,/objective\.kind==='equip-ship'/);
  assert.match(source,/objective\.ship!==equippedShipId/);
  assert.match(source,/campaign\.record\(readSave\(\),\{[\s\S]*type:'equip-ship'/);
  assert.match(source,/campaign\.claim\(readSave\(\),mission\.id\)/);
  assert.match(source,/islandPanel\?\.refreshMissionBoard\?\.\(\)/);
});


test('missão 16 preserva o fluxo de conclusão e executa a cinemática somente antes da transferência', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source,/if \(finalMission\.status === 'active'\) recordMissionEvent\(\{type:'exit',id:'r1-exit-east'\}\)/);
  assert.match(source,/exitDialog\.hidden = false/);
  assert.match(source,/resolveMissionReward\(save,'r1-finale'\)/);
  assert.match(source,/const patch=activateNextRegion\(save\)/);
  assert.match(source,/beginR1ExitCinematic\(patch\)/);
  assert.match(source,/transferPatch/);
  assert.match(source,/writePatch\(\{\.\.\.transferPatch,playerPosition:\{x:420,y:860\}\}\)/);
  assert.match(source,/shipId:'terror-do-mar'/);
  assert.match(source,/world\.manualCamera=\{x:terror\.x,y:terror\.y\}/);
});


test('replay temporário da missão 16 é local e roda uma única vez', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source,/devReplayR1FinaleOnceV1/);
  assert.match(source,/localDev && !snapshot\.devFlags\?\.\[replayKey\]/);
  assert.match(source,/activeRegion:1/);
  assert.match(source,/claimed:\(campaign\.claimed\?\?\[\]\)\.filter\(id=>id!=='r1-finale'\)/);
  assert.match(source,/playerPosition:\{x:3740,y:1200\}/);
});
