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

export const REPAIR_DURATION_MS = 10000;

// Repairs are a reserve: questions never directly heal the hull.
export function accumulateHullRepair(save = {}, forced = false) {
  const combat = save.combat ?? {};
  const health = Math.max(0, Math.min(100, Number(combat.shipHealth) || 0));
  if (health >= 100 || combat.repairingUntil) return null;
  const required = forced || health <= 0 ? 100 : 100 - health;
  const pending = Math.min(required, Math.max(0, Number(combat.repairPending) || 0) + BASE_REPAIR_PERCENT);
  return { patch: { combat: { ...combat, repairPending: pending } }, pending, required };
}
export function beginHullRecovery(save = {}, now = Date.now()) {
  const combat = save.combat ?? {};
  const health = Math.max(0, Math.min(100, Number(combat.shipHealth) || 0));
  const pending = Math.max(0, Number(combat.repairPending) || 0);
  if (!pending || combat.repairingUntil) return null;
  const required = health <= 0 ? 100 : 100 - health;
  if (health <= 0 && pending < required) return null;
  const target = Math.min(100, health + pending);
  return { combat: { ...combat, repairPending: 0, repairingFrom: health,
    repairingTo: target, repairingStartedAt: now, repairingUntil: now + REPAIR_DURATION_MS } };
}
export function advanceHullRecovery(save = {}, now = Date.now()) {
  const combat = save.combat ?? {};
  if (!combat.repairingUntil) return null;
  const duration = Math.max(1, combat.repairingUntil - combat.repairingStartedAt);
  const progress = Math.max(0, Math.min(1, (now - combat.repairingStartedAt) / duration));
  const health = combat.repairingFrom + (combat.repairingTo - combat.repairingFrom) * progress;
  return { combat: { ...combat, shipHealth: Math.min(100, health),
    ...(progress >= 1 ? { repairingUntil: null, repairingStartedAt: null,
      repairingFrom: null, repairingTo: null } : {}) } };
}
