export const BASE_REPAIR_PERCENT = 20;
export const MAX_REPAIR_PERCENT = 30;
export const MAX_HULL_HEALTH = 100;
export const getMaxHullHealth = save => !save?.shipUpgrades?.masterShipwright ? 100
  : save?.equipment?.equippedShipId === 'fragata-sombra-cacadora' ? 600 : 2000;

// Future consumables may contribute at most +10 percentage points per answer.
// A repair always restores a percentage of MAXIMUM hull HP, not missing HP.
export function repairHull(save = {}, bonusPercent = 0) {
  const maxHealth=getMaxHullHealth(save);
  const current = Number.isFinite(save.combat?.shipHealth)
    ? Math.max(0, Math.min(maxHealth, save.combat.shipHealth)) : maxHealth;
  if (current >= maxHealth) return null;
  const bonus = Number.isFinite(bonusPercent) ? Math.max(0, bonusPercent) : 0;
  const percentage = Math.min(MAX_REPAIR_PERCENT, BASE_REPAIR_PERCENT + bonus);
  const after = Math.min(maxHealth, current + maxHealth * percentage / 100);
  return {
    before: current,
    after,
    restored: after - current,
    percent: percentage,
    patch: { combat: { ...save.combat, shipHealth: after } },
  };
}

// One successful multiplication starts continuous 10% max hull repair per second.
export const REPAIR_RATE_PER_SECOND = 10;
export const REPAIR_DURATION_MS = 10000;
export function accumulateHullRepair(save = {}) {
  const combat=save.combat??{};
  const maxHealth=getMaxHullHealth(save);
  const health=Math.max(0,Math.min(maxHealth,Number(combat.shipHealth) || 0));
  if(health>=maxHealth || combat.repairingUntil)return null;
  const now=Date.now();
  return {patch:{combat:{...combat,repairPending:0,repairingFrom:health,
    repairingTo:maxHealth,repairingStartedAt:now,
    repairingUntil:now+(maxHealth-health)/(maxHealth*.1)*1000}},
    pending:maxHealth-health,required:maxHealth-health};
}
export function beginHullRecovery(save = {}) {
  // Compatibility: repair starts at the exact moment the question is solved.
  return null;
}
export function cancelHullRecovery(save = {}) {
  const combat=save.combat??{};
  if(!combat.repairingUntil)return null;
  const repaired=advanceHullRecovery(save);
  return {combat:{...repaired.combat,repairingUntil:null,
    repairingStartedAt:null,repairingFrom:null,repairingTo:null}};
}
export function advanceHullRecovery(save = {},now=Date.now()) {
  const combat=save.combat??{};
  if(!combat.repairingUntil)return null;
  const from=Math.max(0,Number(combat.repairingFrom)||0);
  const elapsed=Math.max(0,now-(Number(combat.repairingStartedAt)||now));
  const maxHealth=getMaxHullHealth(save);
  const health=Math.min(maxHealth,from+elapsed*maxHealth*.1/1000);
  const complete=health>=maxHealth||now>=combat.repairingUntil;
  return {combat:{...combat,shipHealth:health,
    ...(complete?{repairingUntil:null,repairingStartedAt:null,repairingFrom:null,repairingTo:null}:{})}};
}
