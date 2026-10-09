import { recordRegionChallenge } from '../education/RegionMastery.js';
import {
  acceptCampaignMission, recordCampaignEvent,
  claimCampaignMission, startRegion2,
} from '../missions/RegionOneCampaign.js';
import { claimTreasure } from '../treasures/RegionTreasures.js';
import { accumulateHullRepair } from '../combat/HullRepair.js';
import { CANNONS } from '../items/EquipmentCatalog.js';


export function applyNegotiationTheft(save) {
  const equipment = save.equipment ?? {};
  const ids = [...new Set([
    ...(equipment.ownedCannonIds ?? []),
    ...Object.keys(equipment.cannonCounts ?? {}).filter(id => equipment.cannonCounts[id] > 0),
    ...Object.values(equipment.loadout ?? {}).flat().filter(Boolean),
  ])];
  const strongest = ids.map(id => CANNONS.find(c => c.id === id))
    .filter(Boolean).sort((a,b) => b.damageMultiplier - a.damageMultiplier
      || b.caliberPounder - a.caliberPounder)[0]?.id;
  const counts = strongest ? Math.max(1, Number(equipment.cannonCounts?.[strongest])
    || Object.values(equipment.loadout ?? {}).flat().filter(id => id === strongest).length) : 0;
  return {
    profile: { ...save.profile, gold: 0 },
    equipment: { ...equipment,
      ownedCannonIds: strongest ? [strongest] : [],
      cannonCounts: strongest ? { [strongest]: counts } : {},
      loadout: Object.fromEntries(Object.entries(equipment.loadout ?? {})
        .map(([ship,slots]) => [ship,slots.map(id => id === strongest ? id : null)])),
    },
    campaign: { ...save.campaign, negotiationRobbed: true },
  };
}

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
    const outcome = accumulateHullRepair(save, Number(save.combat?.shipHealth) <= 0);
    if (!outcome) return null;
    patch = outcome.patch;
    message = 'Reparo acumulado: ' + outcome.pending + '/' + outcome.required + ' PV.';
  } else if (type === 'negotiation') {
    const campaign = save.campaign ?? {};
    if (!campaign.active?.includes('r1-negotiation') || campaign.negotiationRobbed) return null;
    const completed = Math.min(5, Math.max(0, Number(campaign.progress?.['r1-negotiation']?.[0]) || 0) + 1);
    patch = completed === 5 ? applyNegotiationTheft(save) : {};
    questEvent = { type: 'negotiate', id: 'negotiation-answer-' + completed };
    message = completed === 5
      ? '☠️ Era um golpe! O ladrão levou todo o ouro e os canhões mais fracos. Seu melhor canhão foi poupado.'
      : 'Acordo em andamento: ' + completed + '/5 continhas.';
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
