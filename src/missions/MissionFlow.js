import { getCampaignBoard } from './RegionOneCampaign.js';

// The short initial voyage is guided; the rest of the campaign is free-play.
export function getMissionFlow(save = {}, shipId) {
  const missions = save.missions ?? {};
  const armed = (save.equipment?.loadout?.[shipId] ?? []).some(Boolean);
  const accepted = Boolean(save.tutorial?.firstMissionAccepted);
  if (!accepted) return { destination:'missions', objective:'Visite o Porto das Missões', stage:'welcome' };
  if (!armed) return { destination:'shipyard', objective:'Equipe um canhão no Estaleiro', stage:'equip' };
  if (missions.corsair === 'active') return {
    destination:null, objective:'Afunde 1 Corsário das Velas Rubras', stage:'combat',
  };
  if (missions.corsair !== 'complete') return {
    destination:'missions', objective:'Vá ao Porto das Missões buscar sua missão', stage:'mission',
  };
  const board = getCampaignBoard(save);
  if (board.activeRegion >= 2) return {
    destination:null, stage:'stage2',
    objective:'Etapa 2 iniciada: tabuada do 3 desbloqueada',
  };
  if (board.unlockedRegion >= 2) return {
    destination:null, stage:'ready2',
    objective:'Etapa 2 liberada! Abra o Quadro de Missões para avançar',
  };
  if (board.claimable.length) return {
    destination:null, stage:'free',
    objective:'📦 ' + board.claimable.length + ' recompensa(s) de missão aguardando resgate',
  };
  if (board.active.length) return {
    destination:null, stage:'free',
    objective:board.active[0].objectives.map((task, index) =>
        task.label + ' · ' + Math.floor(board.active[0].progress[index] ?? 0) + '/' + task.count).join(' · '),
  };
  return {
    destination:null, stage:'free',
    objective:'Você tem uma nova missão. Vá até o porto de missões para iniciar',
  };
}
