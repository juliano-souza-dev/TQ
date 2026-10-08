import { CANNONS, AMMUNITION, isItemVisible, EVENTS } from '../items/EquipmentCatalog.js';
export const AMMO_STATS = Object.freeze({
  'rusted-iron': { damage: 10, rangeMultiplier: 1, accuracyBonus: 0 },
});
export function fireCannons({loadout,shipId,ammoId,ammoCount,target,distance,now,lastFired={},random=Math.random}) {
  const ammo = AMMUNITION.find(a=>a.id===ammoId && isItemVisible(a,EVENTS));
  const stats = AMMO_STATS[ammoId];
  if (!ammo || !stats || !Number.isInteger(ammoCount) || ammoCount <= 0) return {shots:[],lastFired,spent:0,damage:0,reason:'ammo'};
  if (!target || target.health <= 0) return {shots:[],lastFired,spent:0,damage:0,reason:'target'};
  const shots=[], next={...lastFired};
  let configured = 0, inRange = 0, shortestCooldown = Infinity;
  let spent=0,damage=0;
  for (let slot=0;slot<(loadout?.[shipId]?.length??0);slot++) {
    const cannonId=loadout[shipId][slot];
    const cannon=CANNONS.find(c=>c.id===cannonId && isItemVisible(c,EVENTS));
    if (!cannon || !Number.isFinite(cannon.reloadSeconds) || !Number.isFinite(cannon.accuracy) || !Number.isFinite(cannon.damageMultiplier) || !Number.isFinite(cannon.caliberPounder)) continue;
    configured++;
    if (spent>=ammoCount) break;
    const range=cannon.caliberPounder*15*stats.rangeMultiplier;
    if (distance>range || distance<0) continue;
    inRange++;
    const key=shipId+':'+slot;
    const remaining = cannon.reloadSeconds*1000-(now-(next[key]??-Infinity));
    if (remaining>0) { shortestCooldown=Math.min(shortestCooldown,remaining); continue; }
    next[key]=now;spent++;
    const hit=random()<Math.min(1,Math.max(0,cannon.accuracy+stats.accuracyBonus));
    const dealt=hit?Math.max(1,Math.round(stats.damage*cannon.damageMultiplier)):0;
    damage+=dealt;
    shots.push({slot,hit,damage:dealt,ammoId,cannonId});
  }
  return {shots,lastFired:next,spent,damage,reason:shots.length?'fired':!configured?'no-cannon':!inRange?'range':'cooldown',cooldownMs:Number.isFinite(shortestCooldown)?shortestCooldown:0};
}
