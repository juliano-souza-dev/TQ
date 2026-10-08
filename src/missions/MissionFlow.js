// Single source of truth for mission-driven player guidance.
export function getMissionFlow(save = {}, shipId) {
  const missions = save.missions ?? {};
  const armed = (save.equipment?.loadout?.[shipId] ?? []).some(Boolean);
  const accepted = Boolean(save.tutorial?.firstMissionAccepted);
  if (!accepted) return { destination:'missions', objective:'Visite o Porto das Missões', stage:'welcome' };
  if (!armed) return { destination:'shipyard', objective:'Equipe um canhão no Estaleiro', stage:'equip' };
  if (missions.corsair === 'active') return { destination:null, objective:'Afunde 1 Corsário das Velas Rubras', stage:'combat' };
  if (missions.corsair === 'complete') return { destination:'missions', objective:'Volte ao Porto das Missões para continuar', stage:'next' };
  return { destination:'missions', objective:'Vá ao Porto das Missões buscar sua missão', stage:'mission' };
}
