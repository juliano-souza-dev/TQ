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
  REGION_ONE_TREASURES, getVisibleTreasures, claimTreasure,
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

test('accepting a two-port mission immediately credits the port where the captain already is', () => {
  let save = initial();
  save.campaign.claimed = ['r1-patrol', 'r1-twos', 'r1-cartography'];
  const result = resolvePedagogicalAction(
    save, { kind: 'accept-mission', id: 'r1-two-ports' },
    challenge(2, 1), true,
  );
  assert.ok(result);
  save = apply(save, result.patch);
  const mission = getCampaignBoard(save).missions.find(item => item.id === 'r1-two-ports');
  assert.deepEqual(mission.progress, [0, 1],
    'the player must not need to leave and re-enter the mission port');
});

test('mission 12 is Para o Estaleiro, grants 1000 basic balls only after equipping Rosas de Ouro', () => {
  assert.equal(R1_MISSIONS[11].id, 'r1-equip-roses');
  const predecessors = R1_MISSIONS.slice(0,11).map(m => m.id);
  let save = initial();
  save.campaign.claimed = predecessors;
  save.equipment = { ...save.equipment, ownedShipIds:['galeao-rosas-de-ouro'] };
  save = apply(save, acceptCampaignMission(save,'r1-equip-roses'));
  assert.equal(getCampaignBoard(save).missions[11].ready,false);
  assert.equal(recordCampaignEvent(save,{type:'equip-ship',ship:'starter'}),null);
  assert.equal(claimCampaignMission(save,'r1-equip-roses'),null);
  save.equipment.equippedShipId = 'galeao-rosas-de-ouro';
  save = apply(save, recordCampaignEvent(save,{type:'equip-ship',ship:'galeao-rosas-de-ouro'}));
  assert.equal(getCampaignBoard(save).missions[11].ready,true);
  const award = claimCampaignMission(save,'r1-equip-roses');
  assert.equal(award.patch.ammunition['rusted-iron'],1020);
  save = apply(save, award.patch);
  assert.equal(claimCampaignMission(save,'r1-equip-roses'),null);
});
