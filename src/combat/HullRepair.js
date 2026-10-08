export const BASE_REPAIR_PERCENT = 20;
export const MAX_REPAIR_PERCENT = 30;
export const MAX_HULL_HEALTH = 100;

// Future consumables may contribute at most +10 percentage points per answer.
// A repair always restores a percentage of MAXIMUM hull HP, not missing HP.
export function repairHull(save = {}, bonusPercent = 0) {
  const current = Number.isFinite(save.combat?.shipHealth)
    ? Math.max(0, Math.min(MAX_HULL_HEALTH, save.combat.shipHealth)) : MAX_HULL_HEALTH;
  if (current >= MAX_HULL_HEALTH) return null;
  const bonus = Number.isFinite(bonusPercent) ? Math.max(0, bonusPercent) : 0;
  const percentage = Math.min(MAX_REPAIR_PERCENT, BASE_REPAIR_PERCENT + bonus);
  const after = Math.min(MAX_HULL_HEALTH, current + MAX_HULL_HEALTH * percentage / 100);
  return {
    before: current,
    after,
    restored: after - current,
    percent: percentage,
    patch: { combat: { ...save.combat, shipHealth: after } },
  };
}
