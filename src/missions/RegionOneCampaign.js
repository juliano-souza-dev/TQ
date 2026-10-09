import { EVENTS } from '../items/EquipmentCatalog.js';
import { getRegionMastery } from '../education/RegionMastery.js';

// Contracts are completed through gameplay; no separate math academy.
export const R1_MISSIONS = Object.freeze([
  { id:'r1-patrol', name:'Patrulha das Velas Rubras', description:'A enseada está sob ameaça das Velas Rubras. O capitão do porto confia a você a primeira patrulha: derrube dois corsários para provar que sua bandeira merece navegar livre.', objectives:[{kind:'defeat',archetype:'red-sail-corsair',count:2,label:'Afundar 2 Corsários das Velas Rubras'}],reward:{gold:100,ammo:{'volcanic-lava':150}}},
  { id:'r1-treasure-i',name:'Caça ao Tesouro I',description:'Um velho mapa encontrado entre os destroços indica dez arcas perdidas. Explore os recifes, decifre os desafios de tabuada e reúna o ouro necessário para a próxima jornada.',objectives:[{kind:'treasure',count:10,label:'Resgatar 10 tesouros'}],reward:{gold:50,iron:35}},
  { id:'r1-red-executioner',name:'Carrasco das Velas Rubras',description:'A vitória na patrulha irritou o comandante das Velas Rubras. Agora uma frota tenta cercar a enseada. Destrua dez corsários e abra passagem para os mercadores.',objectives:[{kind:'defeat',archetype:'red-sail-corsair',count:10,label:'Destruir 10 Corsários das Velas Rubras'}],reward:{gold:100,iron:15000}},
  { id:'r1-treasure-hunt',name:'As Arcas da Enseada',description:'Dois baús escaparam de um navio saqueado e ainda flutuam entre as ondas. Recupere-os antes dos piratas rivais e use o achado para reforçar sua artilharia.',objectives:[{kind:'treasure',count:2,label:'Resgatar 2 tesouros'}],reward:{gold:55,iron:35,cannons:{'blue-gold-pirate':3}}},
  { id:'r1-shipyard',name:'Provisões para o Estaleiro',description:'O mestre do estaleiro avisa que sua embarcação não resistirá à próxima ofensiva sem novos canhões. Atracar, equipar e partir: cada peça fará diferença na batalha.',objectives:[{kind:'visit',island:'shipyard',count:1,label:'Visitar o Estaleiro'},{kind:'equip',count:1,label:'Completar os canhões do navio'}],reward:{gold:35,ammo:{'terror-rose':1500}}},
  { id:'r1-five-chain',name:'A Corrente dos Cinco',description:'Os sobreviventes das Velas Rubras uniram quinze navios numa corrente de bloqueio. Rompa o cerco e devolva à enseada as rotas que os pescadores perderam.',objectives:[{kind:'defeat',archetype:'red-sail-corsair',count:15,label:'Afundar 15 corsários'}],reward:{gold:65,iron:45}},
  { id:'r1-treasure-ii',name:'Caça ao Tesouro II',description:'Com o bloqueio quebrado, surgem novas pistas sobre doze tesouros espalhados pelo mar. Siga os sinais dos antigos navegadores e resolva cada desafio para abrir as arcas.',objectives:[{kind:'treasure',count:12,label:'Resgatar 12 tesouros'}],reward:{gold:100,iron:100}},
  { id:'r1-hunt',name:'Caçada na Maré Vermelha',description:'Três corsários fugitivos carregam informações sobre uma ameaça maior. Alcance seus navios antes que atravessem a Maré Vermelha e impeça que alertem os aliados.',objectives:[{kind:'defeat',archetype:'red-sail-corsair',count:3,label:'Afundar 3 Corsários das Velas Rubras'}],reward:{gold:100,iron:65}},
  { id:'r1-treasure-iii',name:'Caça ao Tesouro III',description:'Um diário encharcado revela cinco arcas protegidas por enigmas. Dentro delas pode estar o Canhão Real Dourado, arma capaz de mudar os rumos da próxima batalha.',objectives:[{kind:'treasure',count:5,label:'Resgatar 5 tesouros'}],reward:{cannons:{'royal-lion':3}}},
  { id:'r1-shipyard-upgrade',name:'Artilharia Renovada',description:'O Canhão Real Dourado foi recuperado, mas ainda está guardado. Volte ao estaleiro, substitua uma arma mais fraca e prepare o navio para águas onde até monstros despertam.',objectives:[{kind:'equip',cannon:'royal-lion',count:1,label:'Substituir canhão fraco pelo Real Dourado'}],requires:['r1-treasure-iii'],reward:{gold:100}},
  { id:'r1-kraken-hunt',name:'Hora da Caça',description:'Pescadores contam que um monstro colossal emerge das profundezas e arrasta cascos para o fundo. Chegou a Hora da Caça: enfrente e derrote um Kraken para proteger a rota marítima.',objectives:[{kind:'defeat',archetype:'sea-monster-kraken',count:1,label:'Derrotar 1 Kraken'}],reward:{ammo:{'rusted-iron':1000}}},
  { id:'r1-roses',name:'Corsário das Rosas de Ouro',description:'A derrota do Kraken abre caminho para um corsário lendário: o capitão das Rosas de Ouro. Afunde seu galeão e reivindique o navio que se tornou símbolo de poder na enseada.',objectives:[{kind:'defeat',archetype:'rose-gold-corsair',count:1,label:'Afundar o Corsário das Rosas de Ouro'}],reward:{ships:['galeao-rosas-de-ouro']}},
  { id:'r1-equip-roses',name:'Para o Estaleiro',description:'O Galeão Rosas de Ouro agora pertence à sua frota, mas uma conquista só vira força quando está pronta para zarpar. Visite o estaleiro e assuma o comando da nova embarcação.',objectives:[{kind:'equip-ship',ship:'galeao-rosas-de-ouro',count:1,label:'Equipar o navio Rosas de Ouro'}],requires:['r1-roses'],reward:{ammo:{'rusted-iron':1000}}},
  { id:'r1-three-winds',name:'A Prova dos Três Ventos',description:'Três ventos se cruzam na saída da enseada, trazendo corsários e arcas à deriva. Vença uma última grande campanha de batalhas e exploração para provar seu domínio do oceano.',objectives:[{kind:'defeat',archetype:'red-sail-corsair',count:25,label:'Afundar 25 corsários'},{kind:'treasure',count:15,label:'Resgatar 15 tesouros'}],reward:{ammo:{'halloween-purple-ball':15000}}},
  { id:'r1-finale',name:'Despedida da Enseada dos Aprendizes',description:'Com a enseada a salvo, o farol da Costa dos Corsários finalmente acende. Navegue até a passagem indicada, deixe para trás seu porto de origem e comece o próximo capítulo.',objectives:[{kind:'exit',count:1,label:'Alcançar a saída para a Costa dos Corsários'}],requires:['r1-three-winds'],reward:{}},
  { id:'r1-halloween-sparks',name:'Brilhos do Mar Assombrado',description:'Em noites de névoa, brilhos misteriosos dançam entre as ondas. Os marinheiros dizem que são lembranças de um mar assombrado. Recolha dois deles antes que desapareçam.',event:'halloween',optional:true,objectives:[{kind:'collect',count:2,label:'Coletar 2 brilhos'}],reward:{gold:60,iron:40,ammo:{'halloween-purple-ball':35}}},
].map(m=>Object.freeze({...m,objectives:Object.freeze(m.objectives.map(Object.freeze)),reward:Object.freeze(m.reward)})));
export const REQUIRED_R1_CONTRACTS = 15;

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
    && (mission.optional || R1_MISSIONS.filter(m=>!m.optional).find(m=>!campaign.claimed.includes(m.id))?.id === mission.id)
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
    && essentialClaimed >= REQUIRED_R1_CONTRACTS;
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
  if (!mission || mission.status !== 'available' || campaignState(save).active.some(id=>R1_MISSIONS.some(m=>m.id===id&&!m.optional)) && !mission.optional) return null;
  const campaign = campaignState(save);
  // Halloween lights are unique finite collectibles; progress already collected
  // before accepting must count, or the optional mission can become impossible.
  const initial = mission.objectives.map(task =>
    task.kind === 'collect' ? Math.min(task.count, (save.collectedGlints ?? []).length)
    : task.kind === 'equip-ship' && save.equipment?.equippedShipId === task.ship ? 1 : 0);
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
  if (task.kind === 'equip') return !task.cannon || task.cannon === event.cannon;
  if (task.kind === 'equip-ship') return task.ship === event.ship;
  return true;
}
export function recordCampaignEvent(save = {}, event, events = EVENTS) {
  if (!event || !['defeat', 'study', 'travel', 'visit', 'collect', 'treasure', 'equip', 'equip-ship', 'exit'].includes(event.type)) return null;
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
  const inventory = save.equipment ?? {};
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
      ...Object.fromEntries(Object.entries(reward.ammo ?? {}).map(([key,qty]) => [key,(Number(ammo[key]) || 0) + qty])),
    },
  };
  if (reward.cannons || reward.ships) next.equipment = {
    ...inventory,
    ownedCannonIds:[...new Set([...(inventory.ownedCannonIds ?? []),...Object.keys(reward.cannons ?? {})])],
    cannonCounts:{...inventory.cannonCounts,...Object.fromEntries(Object.entries(reward.cannons ?? {}).map(([key,qty])=>[key,(inventory.cannonCounts?.[key]??0)+qty]))},
    ownedShipIds:[...new Set([...(inventory.ownedShipIds ?? []),...(reward.ships ?? [])])],
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
