function literalObjectiveName(objective = {}) {
  const label=String(objective.label||'').trim();
  if(label)return label;
  if(objective.name)return String(objective.name).trim();
  if(objective.targetName)return String(objective.targetName).trim();
  if(objective.archetype)return String(objective.archetype).trim();
  if(objective.ship)return String(objective.ship).trim();
  if(objective.cannon)return String(objective.cannon).trim();
  return 'Objetivo';
}

export function missionObjectiveHudName(objective = {}) {
  return literalObjectiveName(objective);
}

export function formatMissionHudObjectives(mission) {
  if (!mission?.objectives?.length) return '';
  return mission.objectives.map((objective, index) => {
    const value = Math.max(0, Math.floor(Number(mission.progress?.[index]) || 0));
    const count = Math.max(1, Math.floor(Number(objective.count) || 1));
    return literalObjectiveName(objective) + ' · ' + Math.min(value, count) + '/' + count;
  }).join(' · ');
}
