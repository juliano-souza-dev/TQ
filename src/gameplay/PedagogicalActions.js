import { recordRegionChallenge } from '../education/RegionMastery.js';
import {
  acceptCampaignMission, recordCampaignEvent,
  claimCampaignMission, startRegion2,
} from '../missions/RegionOneCampaign.js';
import { claimTreasure,treasureReward } from '../treasures/RegionTreasures.js';
import { accumulateHullRepair,advanceHullRecovery,getMaxHullHealth } from '../combat/HullRepair.js';
import { CANNONS } from '../items/EquipmentCatalog.js';
import { fleetEnabled, recordFleetTreasure } from '../missions/FleetCampaign.js';


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
    const outcome = fleetEnabled(save)
      ? {patch:recordFleetTreasure(save,action.regionId,action.id,action.region),reward:{...treasureReward(action.id),gold:100,iron:350}}
      : claimTreasure(save, action.id);
    if (!outcome?.patch) return null;
    patch = outcome.patch;
    // Toda coleta de destroços concede o mesmo pacote especial, sem depender de missão.
    const draw=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
    const bonus={
      'halloween-purple-ball':draw(1,150),
      'ocean-pearl':draw(159,199),
      'violet-crystal':10,
    };
    // Orbes de Abóbora e Rosas do Terror são exclusivas dos destroços da R3.
    if(action.regionId==='r3'){
      bonus['purple-pumpkin-orb']=draw(100,350);
      bonus['terror-rose']=draw(1,20);
    }
    patch.ammunition={...patch.ammunition};
    for(const [id,amount] of Object.entries(bonus))
      patch.ammunition[id]=(Number(patch.ammunition[id])||0)+amount;
    questEvent = fleetEnabled(save)?null:{ type: 'treasure', id: action.id };
    message = 'Destroços resgatados! +' + outcome.reward.gold
      + ' ouro, +' + outcome.reward.iron + ' ferro, +'+outcome.reward.doubleDamage
      + ' Dano 2×, +'+outcome.reward.flame5x+' 5X em Chamas, ' +
      Object.entries(bonus).map(([id,amount])=>'+'+amount+' '+({
        'halloween-purple-ball':'Bolas Roxas',
        'purple-pumpkin-orb':'Orbes de Abóbora Roxa',
        'ocean-pearl':'Pérolas Oceânicas',
        'violet-crystal':'Cristais Violetas',
        'terror-rose':'Rosas do Terror',
      }[id])).join(' · ');
  } else if (type === 'repair') {
    // Repair is not a one-use mission action. During the math question,
    // the current repair may finish or the hull may be healed by another
    // mechanism. A correct answer must not be falsely reported as invalid.
    const settled=advanceHullRecovery(save);
    const current=settled?{...save,...settled}:save;
    const outcome=accumulateHullRepair(current);
    patch=outcome?.patch??settled??{};
    message=outcome?.patch
      ? 'Reparação iniciada! +10% da vida máxima por segundo.'
      : Number(current.combat?.shipHealth)>=getMaxHullHealth(current)
        ? 'Resposta correta! O casco já está totalmente reparado.'
        : 'Resposta correta! A recuperação do casco já está em andamento.';
  } else if (type === 'negotiation') {
    const campaign = save.campaign ?? {};
    if (!campaign.active?.includes('r1-negotiation') || campaign.negotiationRobbed) return null;
    const completed = Math.min(5, Math.max(0, Number(campaign.progress?.['r1-negotiation']?.[0]) || 0) + 1);
    patch = completed === 5 ? applyNegotiationTheft(save) : {};
    questEvent = { type: 'negotiate', id: 'negotiation-answer-' + completed };
    message = completed === 5
      ? '☠️ Era um golpe! O ladrão levou todo o ouro e os canhões mais fracos. Seu melhor canhão foi poupado.'
      : 'Acordo em andamento: ' + completed + '/5 continhas.';
  } else if (type === 'informant') {
    patch = {};
    message = 'O informante revela mais uma pista.';
  } else if (type === 'monster-assist') {
    patch = {};
    message = 'Ajuda convocada!';
  } else if (type === 'island-riddle') {
    patch = {};
    message = 'Enigma da Ilha Esquecida decifrado!';
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
