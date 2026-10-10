export function uniqueMissionIds(ids, missions = []) {
  const valid = new Set(missions.map(m => m.id));
  return [...new Set(Array.isArray(ids) ? ids : [])].filter(id => valid.has(id));
}

export function canonicalSingleMissionState(input = {}, missions = []) {
  const claimed = uniqueMissionIds(input.claimed, missions);
  const active = missions.some(m => m.id === input.active) && !claimed.includes(input.active)
    ? input.active : null;
  return {
    ...input,
    active,
    claimed,
    progress: input.progress && typeof input.progress === 'object' ? input.progress : {},
    processed: Array.isArray(input.processed) ? [...new Set(input.processed)] : [],
  };
}

export function missionStatus({ claimed=false, active=false, ready=false, available=false } = {}) {
  if (claimed) return 'claimed';
  if (active) return ready ? 'ready' : 'active';
  return available ? 'available' : 'locked';
}

export function activeBoardMissions(missions = []) {
  return missions.filter(m => m.status === 'active' || m.status === 'ready');
}

export function uniqueClaimedCount(ids, missions = [], { includeOptional=true } = {}) {
  const allowed = new Map(missions.map(m => [m.id, m]));
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .filter(id => allowed.has(id) && (includeOptional || !allowed.get(id)?.optional)).length;
}
