const OBJECTIVE_NAMES = Object.freeze({
  defeat:'NPC',
  treasure:'Tesouro',
  thief:'Ladrão',
  'morbi-defeat-player':'Morbi',
  'morbi-defeat':'Morbi',
  'black-market':'Mercado Negro',
  'market-equip':'Estaleiro',
  'equip-ship':'Navio',
  equip:'Canhão',
  visit:'Destino',
  informant:'Informante',
  study:'Conta',
  collect:'Item',
  negotiate:'Negociação',
  exit:'Passagem',
  'forgotten-meeting':'Encontro',
  'pumpkin-ambush':'Frota',
  'hunt-supplies':'Suprimentos',
  'monster-meat':'Monstro',
});

export function missionObjectiveHudName(objective = {}) {
  if (OBJECTIVE_NAMES[objective.kind]) return OBJECTIVE_NAMES[objective.kind];
  const label = String(objective.label || '').trim();
  if (/npc|cors[aá]rio|navio inimigo/i.test(label)) return 'NPC';
  if (/tesouro|arca/i.test(label)) return 'Tesouro';
  if (/canh[aã]o/i.test(label)) return 'Canhão';
  if (/estaleiro/i.test(label)) return 'Estaleiro';
  return label || 'Objetivo';
}

export function formatMissionHudObjectives(mission) {
  if (!mission?.objectives?.length) return '';
  return mission.objectives.map((objective, index) => {
    const value = Math.max(0, Math.floor(Number(mission.progress?.[index]) || 0));
    const count = Math.max(1, Math.floor(Number(objective.count) || 1));
    return missionObjectiveHudName(objective) + ' ' + Math.min(value, count) + '/' + count;
  }).join(' · ');
}
