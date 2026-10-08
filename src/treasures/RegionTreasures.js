import { EVENTS } from '../items/EquipmentCatalog.js';

// Stable locations in R1, outside the collision footprints of its islands.
// A treasure is never removed until a correct pedagogical response is saved.
export const REGION_ONE_TREASURES = Object.freeze([
  { id: 'r1-treasure-01', x: 3270, y: 3170 },
  { id: 'r1-treasure-02', x: 3690, y: 2750 },
  { id: 'r1-treasure-03', x: 3290, y: 2140 },
  { id: 'r1-treasure-04', x: 2210, y: 2010 },
  { id: 'r1-treasure-05', x: 1050, y: 2450 },
  { id: 'r1-treasure-06', x: 640, y: 1150 },
  { id: 'r1-treasure-07', x: 2050, y: 770 },
  { id: 'r1-treasure-08', x: 3510, y: 1100 },
]);
function hashId(id) {
  let seed = 2166136261;
  for (const char of id) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}
export function treasureReward(id) {
  const seed = hashId(id);
  return { gold: 12 + (seed % 24), iron: 16 + ((seed >>> 6) % 29) };
}
export function getVisibleTreasures(save = {}) {
  const opened = new Set(save.openedTreasures ?? []);
  const cycle = Math.floor(opened.size / REGION_ONE_TREASURES.length);
  return REGION_ONE_TREASURES.map(t => ({
    ...t, id: cycle ? t.id + '-cycle-' + cycle : t.id,
  })).filter(t => !opened.has(t.id));
}
export function findTreasureNearPoint(treasures, x, y, radius = 90) {
  let closest = null, best = radius;
  for (const t of treasures) {
    const distance = Math.hypot(t.x - x, t.y - y);
    if (distance < best) { closest = t; best = distance; }
  }
  return closest;
}
export function claimTreasure(save = {}, id) {
  if (!getVisibleTreasures(save).some(t => t.id === id)
    || (save.openedTreasures ?? []).includes(id)) return null;
  const reward = treasureReward(id);
  return {
    reward,
    patch: {
      openedTreasures: [...(save.openedTreasures ?? []), id],
      profile: { ...save.profile, gold: (save.profile?.gold ?? 0) + reward.gold },
      ammunition: {
        ...save.ammunition,
        'rusted-iron': (save.ammunition?.['rusted-iron'] ?? 20) + reward.iron,
      },
    },
  };
}
