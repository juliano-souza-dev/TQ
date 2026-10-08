import { recordRegionChallenge } from '../education/RegionMastery.js';
import {
  acceptCampaignMission, recordCampaignEvent,
  claimCampaignMission, startRegion2,
} from '../missions/RegionOneCampaign.js';
import { claimTreasure } from '../treasures/RegionTreasures.js';
import { repairHull } from '../combat/HullRepair.js';

// Pure transaction: validate the action, record its pedagogical attempt,
// update concurrent quest objectives, and return ONE patch to persist.
export function resolvePedagogicalAction(save, action, challenge, firstTry) {
  const type = action?.kind;
  let patch = null;
  let message = 'Desafio concluído.';
  let questEvent = null;
  if (type === 'accept-mission') {
    patch = acceptCampaignMission(save, action.id);
    if (!patch) return null;
    // Accepting a contract happens at the Missions Port. This visit must count
    // toward two-port objectives without requiring the player to leave and redock.
    questEvent = { type: 'visit', island: 'missions' };
    message = 'Contrato aceito! Boa aventura.';
  } else if (type === 'treasure') {
    const outcome = claimTreasure(save, action.id);
    if (!outcome) return null;
    patch = outcome.patch;
    questEvent = { type: 'treasure', id: action.id };
    message = 'Tesouro resgatado! +' + outcome.reward.gold
      + ' ouro e +' + outcome.reward.iron + ' munições de ferro.';
  } else if (type === 'repair') {
    const outcome = repairHull(save, 0);
    if (!outcome) return null;
    patch = outcome.patch;
    message = 'Casco consertado! +' + Math.round(outcome.restored) + ' PV.';
  } else if (type === 'practice') {
    patch = {};
    message = 'Tabuada praticada.';
  } else {
    return null;
  }

  const recorded = recordRegionChallenge(save.pedagogy, challenge, firstTry);
  if (!recorded.recorded) return null;
  let next = { ...save, ...patch, pedagogy: recorded.progress };
  const study = recordCampaignEvent(next, {
    type: 'study', family: challenge.family, id: challenge.id,
  });
  if (study) next = { ...next, ...study };
  if (questEvent) {
    const progress = recordCampaignEvent(next, questEvent);
    if (progress) next = { ...next, ...progress };
  }
  return { patch: Object.fromEntries(
    Object.keys(next).filter(key => next[key] !== save[key]).map(key => [key, next[key]]),
  ), message };
}

export function resolveMissionReward(save, missionId) {
  return claimCampaignMission(save, missionId);
}

export function activateNextRegion(save) {
  return startRegion2(save);
}
