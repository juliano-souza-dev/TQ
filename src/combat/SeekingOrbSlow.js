// Player-fired tracking orbs slow enemy ships on confirmed hits.
// Each 2% stack lasts 35 seconds independently. A 38th stack reaches the
// 75% ceiling (not 76%); extra hits at the ceiling do not refresh old stacks.
export const SEEKING_ORB_SLOW_PER_HIT=0.02;
export const SEEKING_ORB_SLOW_MAX=0.75;
export const SEEKING_ORB_SLOW_DURATION_MS=35000;
export const SEEKING_ORB_SLOW_MAX_STACKS=Math.ceil(SEEKING_ORB_SLOW_MAX/SEEKING_ORB_SLOW_PER_HIT);
export const SEEKING_ORB_AMMO_IDS=Object.freeze(['aetherion-seeker','glacial-seeker']);

const expiries=(npc,now)=>Array.isArray(npc?.seekingOrbSlowExpiries)
  ? npc.seekingOrbSlowExpiries.filter(time=>Number.isFinite(time)&&time>now)
  : [];

export function getSeekingOrbSlow(npc,now=Date.now()){
  if(!npc||npc.type!=='npc'||npc.health<=0)return 0;
  const active=expiries(npc,now);
  // Prune lazily so expired stacks never affect speed or counts.
  if(Array.isArray(npc.seekingOrbSlowExpiries)&&active.length!==npc.seekingOrbSlowExpiries.length)
    npc.seekingOrbSlowExpiries=active;
  return Math.min(SEEKING_ORB_SLOW_MAX,active.length*SEEKING_ORB_SLOW_PER_HIT);
}

export function applySeekingOrbSlow(npc,ammoId,now=Date.now()){
  if(!SEEKING_ORB_AMMO_IDS.includes(ammoId)||npc?.type!=='npc'||npc.health<=0)return 0;
  const active=expiries(npc,now);
  if(active.length<SEEKING_ORB_SLOW_MAX_STACKS)
    active.push(now+SEEKING_ORB_SLOW_DURATION_MS);
  npc.seekingOrbSlowExpiries=active;
  return Math.min(SEEKING_ORB_SLOW_MAX,active.length*SEEKING_ORB_SLOW_PER_HIT);
}

export function seekingOrbMovementSpeed(npc,baseSpeed,now=Date.now()){
  return Math.max(0,Number(baseSpeed)||0)*(1-getSeekingOrbSlow(npc,now));
}
