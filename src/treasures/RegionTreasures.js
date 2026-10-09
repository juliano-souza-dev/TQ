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
// 48 pontos adicionais navegáveis: total de 72 arcas distribuídas pela enseada.
const EXTRA_TREASURES = [];
for (const y of [300, 800, 1050, 1300, 1800, 2300, 2550, 2800, 3300, 3800]) {
  for (const x of [260, 670, 1080, 1490, 1900, 2310, 2720, 3130, 3540, 3920]) {
    const onIsland = [
      [690, 860, 820, 690],
      [3320, 860, 820, 690],
      [1950, 3520, 900, 740],
    ].some(([ix, iy, w, h]) => Math.abs(x-ix) <= w/2+110 && Math.abs(y-iy) <= h/2+110);
    if (onIsland || REGION_ONE_TREASURES.some(t => Math.hypot(t.x-x,t.y-y) < 200)) continue;
    EXTRA_TREASURES.push({id:'r1-treasure-'+String(25+EXTRA_TREASURES.length).padStart(2,'0'),x,y});
    if (EXTRA_TREASURES.length === 48) break;
  }
  if (EXTRA_TREASURES.length === 48) break;
}
export const ALL_R1_TREASURES = Object.freeze([...REGION_ONE_TREASURES, ...EXTRA_TREASURES].map(Object.freeze));
// Arcas próprias da Costa dos Corsários, independentes da Enseada.
export const R2_TREASURES = Object.freeze(Array.from({length:60},(_,i)=>{
  const col=i%10,row=Math.floor(i/10);
  return Object.freeze({id:'r2-treasure-'+String(i+1).padStart(2,'0'),x:260+col*375,y:245+row*830});
}).filter(t=>!([
  [690,1620,820,690],[3400,1620,820,690],
  [700,4450,900,740],[3380,4450,850,690],
].some(([x,y,w,h])=>Math.abs(t.x-x)<w/2+120&&Math.abs(t.y-y)<h/2+120))));
export const TREASURE_RESPAWN_MS = 30000;

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
// IDs de ciclos são históricos: nunca reutilizar uma arca já coletada,
 // mesmo em saves antigos ou após uma sincronização parcial.
function treasureCatalog(id) {
  return String(id).startsWith('r2-treasure-') ? R2_TREASURES : ALL_R1_TREASURES;
}
function nextTreasureCycle(save, baseId) {
  const opened = save.openedTreasures ?? [];
  const prefix = baseId + '-cycle-';
  let next = Math.max(0, Math.floor(Number(save.treasureClaimCounts?.[baseId]) || 0));
  for (const id of opened) {
    if (id === baseId) next = Math.max(next, 1);
    else if (typeof id === 'string' && id.startsWith(prefix)) {
      const suffix = id.slice(prefix.length);
      if (/^\d+$/.test(suffix)) next = Math.max(next, Number(suffix) + 1);
    }
  }
  return next;
}
export function getVisibleTreasures(save = {}, now = Date.now(), regionId = 'r1') {
  const cooldowns = save.treasureCooldowns ?? {};
  // Deterministic 35% density reduction across both maps; stable IDs and cooldowns remain intact.
  const catalog=regionId==='r2'?R2_TREASURES:ALL_R1_TREASURES;
  return catalog.filter(t => hashId(t.id)%100>=60).flatMap(t => {
    const cycle = nextTreasureCycle(save, t.id);
    const lastClaimedAt = Number(cooldowns[t.id]) || 0;
    if (lastClaimedAt > 0 && now - lastClaimedAt < TREASURE_RESPAWN_MS) return [];
    const id = cycle ? t.id + '-cycle-' + cycle : t.id;
    return [{ ...t, id }];
  });
}
export function findTreasureNearPoint(treasures, x, y, radius = 90) {
  let closest = null, best = radius;
  for (const t of treasures) {
    const distance = Math.hypot(t.x - x, t.y - y);
    if (distance < best) { closest = t; best = distance; }
  }
  return closest;
}
export function claimTreasure(save = {}, id, now = Date.now()) {
  const regionId = String(id).startsWith('r2-treasure-') ? 'r2' : 'r1';
  const treasure = getVisibleTreasures(save, now, regionId).find(t => t.id === id);
  if (!treasure || (save.openedTreasures ?? []).includes(id)) return null;
  const base = treasureCatalog(id).find(t => treasure.id === t.id || treasure.id.startsWith(t.id + '-cycle-'))?.id;
  if (!base) return null;
  const counts = save.treasureClaimCounts ?? {};
  const already = nextTreasureCycle(save, base);
  const reward = treasureReward(id);
  return {
    reward,
    patch: {
      openedTreasures: [...(save.openedTreasures ?? []), id],
      treasureClaimCounts: { ...counts, [base]: already + 1 },
      treasureCooldowns: { ...save.treasureCooldowns, [base]: now },
      profile: { ...save.profile, gold: (save.profile?.gold ?? 0) + reward.gold },
      ammunition: {
        ...save.ammunition,
        'rusted-iron': (save.ammunition?.['rusted-iron'] ?? 20) + reward.iron,
      },
    },
  };
}
