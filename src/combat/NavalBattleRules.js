import {
  AMMUNITION, CANNONS, EVENTS, getAmmunitionAssetUrl, isItemVisible,
} from '../items/EquipmentCatalog.js';
import { navalShotDamage } from './NavalCombatRules.mjs';

// Stable catalog IDs come from EquipmentCatalog. Combat numbers and FX never
// modify inventory item ownership or asset metadata.
export const NAVAL_AMMO = Object.freeze({
  'aetherion-seeker': { damageFactor: 1, damagePerShot: 10, speed: 420, preset: 'piercing', trackingDurationMs: 9000 },
  'rusted-iron': { damageFactor: 1, damagePerShot: 10, speed: 420, preset: 'rusted-iron' },
  'violet-crystal': { damageFactor: 1.5, damagePerShot: 10, speed: 460, preset: 'violet-crystal' },
  'ocean-pearl': { damageFactor: 1.2, damagePerShot: 10, speed: 460, preset: 'ocean-pearl' },
  'volcanic-lava': { damageFactor: 2, damagePerShot: 10, speed: 420, preset: 'volcanic-lava' },
  'purple-pumpkin-orb': { damageFactor: 2.2, damagePerShot: 10, speed: 440, preset: 'halloween-pumpkin' },
  'halloween-purple-ball': { damageFactor: 1.8, damagePerShot: 10, speed: 460, preset: 'halloween' },
  'terror-rose': { damageFactor: 2.4, damagePerShot: 10, speed: 470, preset: 'terror-rose' },
});

const finite = value => Number.isFinite(value) ? value : 0;
export function ammoStock(save, ammoId) {
  const amount = save?.ammunition?.[ammoId];
  // Preserve the starter allocation only until a first explicit debit.
  return amount === undefined && ammoId === 'rusted-iron'
    ? 20 : Math.max(0, Math.floor(Number(amount) || 0));
}
export function availableNavalAmmo(save, events = EVENTS) {
  return AMMUNITION.filter(item => isItemVisible(item, events) && NAVAL_AMMO[item.id])
    .map(item => ({ id: item.id, name: item.name, amount: ammoStock(save, item.id) }));
}
export function armedCannons(save, shipId, events = EVENTS) {
  return (save?.equipment?.loadout?.[shipId] ?? []).flatMap((id, slot) => {
    const cannon = CANNONS.find(item => item.id === id && isItemVisible(item, events));
    if (!cannon || !Number.isFinite(cannon.reloadSeconds)
      || !Number.isFinite(cannon.accuracy) || !Number.isFinite(cannon.caliberPounder)
      || !Number.isFinite(cannon.damageMultiplier)) return [];
    return [{ slot, id, cannon }];
  });
}
export function cannonAcceptsAmmo(cannon, ammoId) {
  if (!cannon || !ammoId) return false;
  if (cannon.exclusiveAmmoId) return cannon.exclusiveAmmoId === ammoId;
  return ammoId !== 'aetherion-seeker';
}
export function cannonRange(cannon) {
  return Math.max(1, finite(cannon.range) || finite(cannon.caliberPounder) * 15);
}
export function effectiveAmmo(ammoId, events = EVENTS) {
  const item = AMMUNITION.find(entry => entry.id === ammoId && isItemVisible(entry, events));
  const rules = NAVAL_AMMO[ammoId];
  if (!item || !rules) return null;
  return {
    id: item.id, name: item.name, size: 1.3,
    projectileSpeed: rules.speed,
    trackingDurationMs: rules.trackingDurationMs ?? 0,
    damageFactor: rules.damageFactor,
    // The original game's ammunition FX presets and texture pipeline.
    fx: { preset: rules.preset, projectile: { texture: getAmmunitionAssetUrl(item) } },
  };
}
export function shotDamage(cannon, ammoId) {
  const profile = NAVAL_AMMO[ammoId];
  if (!profile || !cannonAcceptsAmmo(cannon, ammoId)) return 0;
  return Math.max(1, Math.round(navalShotDamage(
    { damagePerShot: profile.damagePerShot * cannon.damageMultiplier },
    { damageFactor: profile.damageFactor },
  )));
}

export function distanceBetween(a, b) {
  return Math.hypot(finite(a?.x) - finite(b?.x), finite(a?.y) - finite(b?.y));
}
export function interceptPoint(source, target, velocity, speed) {
  const dx = target.x - source.x, dy = target.y - source.y;
  const vx = finite(velocity?.x), vy = finite(velocity?.y), v = Math.max(1, speed);
  const a = vx * vx + vy * vy - v * v;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;
  const roots = [];
  if (Math.abs(a) < 1e-8) {
    if (Math.abs(b) > 1e-8) roots.push(-c / b);
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      roots.push((-b - root) / (2 * a), (-b + root) / (2 * a));
    }
  }
  const t = roots.filter(value => value > 0).sort((left, right) => left - right)[0]
    ?? Math.sqrt(c) / v;
  const travel = Math.max(.04, Math.min(2.5, t));
  return { x: target.x + vx * travel, y: target.y + vy * travel };
}

// Adapted from the old game's navalCannonHardpoint: cannon exits the correct
// side of the hull according to its heading and where the target is located.
export function cannonHardpoint(ship, target, headingDegrees = 0, slot = 0, count = 1) {
  const theta = (finite(headingDegrees) * Math.PI) / 180;
  const forward = { x: Math.sin(theta), y: -Math.cos(theta) };
  const right = { x: Math.cos(theta), y: Math.sin(theta) };
  const toward = (target.x - ship.x) * right.x + (target.y - ship.y) * right.y;
  const sign = toward >= 0 ? 1 : -1;
  const along = count === 1 ? 0 : ((slot / (count - 1)) - .5) * 75;
  return {
    x: ship.x + forward.x * along + right.x * sign * 42,
    y: ship.y + forward.y * along + right.y * sign * 42,
  };
}
export function aimWithAccuracy(point, source, accuracy, random = Math.random) {
  const dx = point.x - source.x, dy = point.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const spread = (1 - Math.max(0, Math.min(1, accuracy))) * Math.max(65, length * .5);
  const lateral = (random() * 2 - 1) * spread;
  const depth = (random() * 2 - 1) * spread * .25;
  return {
    x: point.x + (-dy / length) * lateral + (dx / length) * depth,
    y: point.y + (dx / length) * lateral + (dy / length) * depth,
  };
}
export function flightDurationMs(source, destination, speed) {
  return Math.max(580, Math.min(2300, distanceBetween(source, destination) / Math.max(1, speed) * 1000));
}
export function shipCollision(point, ship, radius = 52) {
  return ship && ship.health > 0 && distanceBetween(point, ship) <= radius;
}
