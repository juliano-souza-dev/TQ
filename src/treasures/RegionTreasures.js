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
  { id: 'r1-treasure-09', x: 450, y: 450 },
  { id: 'r1-treasure-10', x: 1050, y: 450 },
  { id: 'r1-treasure-11', x: 1650, y: 450 },
  { id: 'r1-treasure-12', x: 2650, y: 450 },
  { id: 'r1-treasure-13', x: 3450, y: 450 },
  { id: 'r1-treasure-14', x: 3890, y: 650 },
  { id: 'r1-treasure-15', x: 3850, y: 1720 },
  { id: 'r1-treasure-16', x: 3850, y: 2250 },
  { id: 'r1-treasure-17', x: 3850, y: 3500 },
  { id: 'r1-treasure-18', x: 3350, y: 3850 },
  { id: 'r1-treasure-19', x: 2650, y: 3850 },
  { id: 'r1-treasure-20', x: 1950, y: 3850 },
  { id: 'r1-treasure-21', x: 1250, y: 3850 },
  { id: 'r1-treasure-22', x: 550, y: 3650 },
  { id: 'r1-treasure-23', x: 300, y: 2800 },
  { id: 'r1-treasure-24', x: 320, y: 1850 },
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
