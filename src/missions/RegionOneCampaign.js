import { EVENTS } from '../items/EquipmentCatalog.js';
import { getRegionMastery } from '../education/RegionMastery.js';

// A region is a free-play mission board, not a scripted sequence. Objectives
// share one event bus, but every contract persists its own counters.
export const R1_MISSIONS = Object.freeze([
  {
    id: 'r1-patrol', name: 'Patrulha das Velas Rubras', tier: 1,
    description: 'Afaste os corsários que cercam os navios mercantes.',
    objectives: [{ kind: 'defeat', archetype: 'red-sail-corsair', count: 2, label: 'Afunde 2 Corsários das Velas Rubras' }],
    reward: { gold: 45, iron: 45 },
  },
  {
    id: 'r1-twos', name: 'O Código dos Pares', tier: 1,
    description: 'Treine a tabuada do 2 para decifrar sinais dos navegadores.',
    objectives: [{ kind: 'study', family: 2, count: 8, label: 'Resolva 8 desafios da tabuada do 2' }],
    reward: { gold: 50, iron: 35 },
  },
  {
    id: 'r1-cartography', name: 'Cartógrafo da Enseada', tier: 1,
    description: 'Navegue por conta própria para reconhecer as rotas da R1.',
    objectives: [{ kind: 'travel', count: 750, label: 'Navegue 750 metros pelo oceano' }],
    reward: { gold: 40, iron: 40 },
  },
  {
    id: 'r1-treasure-hunt', name: 'As Arcas da Enseada', tier: 1,
    description: 'Encontre arcas pelo oceano. Abra cada uma resolvendo uma multiplicação.',
    objectives: [{ kind: 'treasure', count: 2, label: 'Resgate 2 tesouros com continhas' }],
    reward: { gold: 55, iron: 35 },
  },
  {
    id: 'r1-shipyard', name: 'Provisões para o Estaleiro', tier: 1,
    description: 'Visite o estaleiro e prepare a próxima patrulha.',
    objectives: [{ kind: 'visit', island: 'shipyard', count: 1, label: 'Visite o Estaleiro' }],
    reward: { gold: 35, iron: 40 },
  },
  {
    id: 'r1-fives', name: 'A Corrente dos Cinco', tier: 2, minClaimed: 2,
    description: 'Encontre o padrão das multiplicações de cinco.',
    objectives: [{ kind: 'study', family: 5, count: 8, label: 'Resolva 8 desafios da tabuada do 5' }],
    reward: { gold: 65, iron: 45 },
  },
  {
    id: 'r1-tens', name: 'Dezenas ao Vento', tier: 2, minClaimed: 2,
    description: 'Aprenda a usar dezenas para calcular rapidamente no mar.',
    objectives: [{ kind: 'study', family: 10, count: 8, label: 'Resolva 8 desafios da tabuada do 10' }],
    reward: { gold: 65, iron: 45 },
  },
  {
    id: 'r1-hunt', name: 'Caçada na Maré Vermelha', tier: 2, minClaimed: 3,
    description: 'Os corsários retornaram. Proteja a enseada.',
    objectives: [{ kind: 'defeat', archetype: 'red-sail-corsair', count: 3, label: 'Afunde 3 Corsários das Velas Rubras' }],
    reward: { gold: 100, iron: 65 },
  },
  {
    id: 'r1-two-ports', name: 'As Duas Rotas do Porto', tier: 2, minClaimed: 3,
    description: 'Leve informações entre o Porto das Missões e o Estaleiro.',
    objectives: [
      { kind: 'visit', island: 'shipyard', count: 1, label: 'Visite o Estaleiro' },
      { kind: 'visit', island: 'missions', count: 1, label: 'Visite o Porto das Missões' },
    ],
    reward: { gold: 80, iron: 45 },
  },
  {
    id: 'r1-roses', name: 'Corsário das Rosas de Ouro', tier: 3, minClaimed: 5,
    description: 'Encontre e vença o galeão especial que patrulha esta região.',
    objectives: [{ kind: 'defeat', archetype: 'rose-gold-corsair', count: 1, label: 'Afunde 1 Corsário das Rosas de Ouro' }],
    reward: { gold: 130, iron: 110 },
  },
  {
    id: 'r1-three-winds', name: 'A Prova dos Três Ventos', tier: 3, minClaimed: 5,
    description: 'Misture os cálculos com 2, 5 e 10 sem perder o rumo.',
    objectives: [
      { kind: 'study', family: 2, count: 4, label: 'Resolva 4 desafios da tabuada do 2' },
      { kind: 'study', family: 5, count: 4, label: 'Resolva 4 desafios da tabuada do 5' },
      { kind: 'study', family: 10, count: 4, label: 'Resolva 4 desafios da tabuada do 10' },
    ],
    reward: { gold: 110, iron: 85 },
  },
  {
    id: 'r1-finale', name: 'O Último Bloqueio da R1', tier: 4, minClaimed: 8,
    requires: ['r1-roses', 'r1-three-winds'],
    description: 'Una cálculo e coragem para liberar a próxima etapa da jornada.',
    objectives: [
      { kind: 'defeat', archetype: 'red-sail-corsair', count: 2, label: 'Afunde 2 Corsários das Velas Rubras' },
      { kind: 'study', family: 2, count: 2, label: 'Resolva 2 desafios da tabuada do 2' },
      { kind: 'study', family: 5, count: 2, label: 'Resolva 2 desafios da tabuada do 5' },
      { kind: 'study', family: 10, count: 2, label: 'Resolva 2 desafios da tabuada do 10' },
    ],
    reward: { gold: 250, iron: 150 },
  },
  {
    id: 'r1-halloween-sparks', name: 'Brilhos do Mar Assombrado', tier: 1,
    event: 'halloween', optional: true,
    description: 'Colete brilhos mágicos do evento. Esta missão não bloqueia a R2.',
    objectives: [{ kind: 'collect', count: 2, label: 'Colete 2 Brilhos do Mar' }],
    reward: { gold: 60, iron: 40, halloween: 35 },
  },
].map(mission => Object.freeze({
  ...mission, objectives: Object.freeze(mission.objectives.map(task => Object.freeze(task))),
  reward: Object.freeze(mission.reward),
})));
export const REQUIRED_R1_CONTRACTS = 8;

export function campaignState(save = {}) {
  const input = save.campaign ?? {};
  return {
    active: Array.isArray(input.active) ? [...new Set(input.active)] : [],
    claimed: Array.isArray(input.claimed) ? [...new Set(input.claimed)] : [],
    progress: input.progress && typeof input.progress === 'object' ? input.progress : {},
    processedEvents: Array.isArray(input.processedEvents) ? input.processedEvents : [],
  };
}
const progressFor = (campaign, mission) =>
  mission.objectives.map((task, index) => Math.min(task.count, Math.max(0, Number(campaign.progress?.[mission.id]?.[index]) || 0)));

function eligible(mission, campaign, events) {
  const claimed = campaign.claimed.filter(id => R1_MISSIONS.some(entry => entry.id === id && !entry.optional)).length;
  return (!mission.event || events[mission.event] === true)
    && claimed >= (mission.minClaimed ?? 0)
    && (mission.requires ?? []).every(id => campaign.claimed.includes(id));
}
export function getCampaignBoard(save = {}, events = EVENTS) {
  const state = campaignState(save);
  const afterIntroduction = save.missions?.corsair === 'complete';
  const missions = R1_MISSIONS.map(mission => {
    const progress = progressFor(state, mission);
    const ready = progress.every((count, index) => count >= mission.objectives[index].count);
    const claimed = state.claimed.includes(mission.id);
    const active = state.active.includes(mission.id);
    return {
      ...mission, progress, claimed, active, ready: active && ready,
      status: claimed ? 'claimed' : active ? (ready ? 'ready' : 'active')
        : !afterIntroduction || !eligible(mission, state, events) ? 'locked' : 'available',
    };
  });
  const mastery = getRegionMastery(save.pedagogy);
  const essentialClaimed = missions.filter(mission => !mission.optional && mission.claimed).length;
  const finaleClaimed = state.claimed.includes('r1-finale');
  const canAdvance = afterIntroduction && finaleClaimed
    && essentialClaimed >= REQUIRED_R1_CONTRACTS && mastery.mastered;
  const unlocked = canAdvance || (save.progression?.unlockedRegion ?? 1) >= 2;
  return {
    afterIntroduction, missions, mastery, essentialClaimed, canAdvance,
    unlockedRegion: unlocked ? 2 : 1,
    activeRegion: (save.progression?.activeRegion ?? 1) >= 2 && unlocked ? 2 : 1,
    active: missions.filter(m => m.active),
    claimable: missions.filter(m => m.ready),
    available: missions.filter(m => m.status === 'available'),
  };
}

export function acceptCampaignMission(save, id, events = EVENTS) {
  const mission = getCampaignBoard(save, events).missions.find(entry => entry.id === id);
  if (!mission || mission.status !== 'available') return null;
  const campaign = campaignState(save);
  // Halloween lights are unique finite collectibles; progress already collected
  // before accepting must count, or the optional mission can become impossible.
  const initial = mission.objectives.map(task =>
    task.kind === 'collect' ? Math.min(task.count, (save.collectedGlints ?? []).length)
    : task.kind === 'treasure' ? Math.min(task.count, (save.openedTreasures ?? []).length)
    : 0);
  return { campaign: {
    ...campaign,
    active: [...campaign.active, id],
    progress: { ...campaign.progress, [id]: initial },
  } };
}

function applies(task, event) {
  if (task.kind !== event.type) return false;
  if (task.kind === 'defeat') return task.archetype === event.archetype;
  if (task.kind === 'study') return task.family === event.family;
  if (task.kind === 'visit') return task.island === event.island;
  return true;
}
export function recordCampaignEvent(save = {}, event, events = EVENTS) {
  if (!event || !['defeat', 'study', 'travel', 'visit', 'collect', 'treasure'].includes(event.type)) return null;
  if (save.missions?.corsair !== 'complete') return null;
  const campaign = campaignState(save);
  const dedup = event.id ? event.type + ':' + String(event.id) : null;
  if (dedup && campaign.processedEvents.includes(dedup)) return null;
  const amount = event.type === 'travel'
    ? Math.max(0, Math.min(200, Number(event.amount) || 0)) : 1;
  if (!(amount > 0)) return null;
  let changed = false;
  const progress = { ...campaign.progress };
  for (const id of campaign.active) {
    const mission = R1_MISSIONS.find(entry => entry.id === id);
    if (!mission || (mission.event && events[mission.event] !== true)) continue;
    const current = progressFor(campaign, mission);
    for (let index = 0; index < mission.objectives.length; index++) {
      const task = mission.objectives[index];
      if (!applies(task, event) || current[index] >= task.count) continue;
      current[index] = Math.min(task.count, current[index] + amount);
      changed = true;
    }
    progress[id] = current;
  }
  if (!changed) return null;
  return { campaign: {
    ...campaign, progress,
    processedEvents: dedup
      ? [...campaign.processedEvents.slice(-299), dedup] : campaign.processedEvents,
  } };
}

export function claimCampaignMission(save = {}, id, events = EVENTS) {
  const selected = getCampaignBoard(save, events).missions.find(item => item.id === id);
  if (!selected || selected.status !== 'ready') return null;
  const state = campaignState(save);
  const reward = selected.reward;
  const profile = save.profile ?? {};
  const ammo = save.ammunition ?? {};
  const next = {
    campaign: {
      ...state,
      active: state.active.filter(item => item !== id),
      claimed: [...state.claimed, id],
    },
    profile: { ...profile, gold: Math.max(0, Number(profile.gold) || 0) + (reward.gold ?? 0) },
    ammunition: {
      ...ammo,
      'rusted-iron': (Number.isInteger(ammo['rusted-iron']) ? ammo['rusted-iron'] : 20) + (reward.iron ?? 0),
      ...(reward.halloween ? {
        'halloween-purple-ball': (ammo['halloween-purple-ball'] ?? 0) + reward.halloween,
      } : {}),
    },
  };
  const updated = { ...save, ...next };
  const board = getCampaignBoard(updated, events);
  if (board.canAdvance) next.progression = {
    ...save.progression, unlockedRegion: 2,
  };
  return { patch: next, mission: selected, region2Unlocked: board.canAdvance };
}
export function startRegion2(save = {}) {
  const board = getCampaignBoard(save);
  if (board.unlockedRegion < 2) return null;
  return { progression: { ...save.progression, unlockedRegion: 2, activeRegion: 2 } };
}
