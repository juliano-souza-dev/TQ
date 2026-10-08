import { STARTER_SHIP } from '../ships/ShipRegistry.js';
export const RED_SAIL_CORSAIR = Object.freeze({
  id: 'red-sail-corsair', name: 'Corsário das Velas Rubras',
  shipId: STARTER_SHIP.id, maxHealth: 25, aggression: 'retaliate',
  speed: Object.freeze({ min: 60, initial: 75, max: 120 }),
  retaliationRange: 360, retaliationCooldownMs: 1800,
});
export function createRedSailCorsair(id, x, y, heading = 180) {
  return { id, type: 'npc', archetype: RED_SAIL_CORSAIR.id,
    name: RED_SAIL_CORSAIR.name, x, y, heading, health: 25, maxHealth: 25,
    lastAttackerId: null, retaliationCooldownMs: 0, state: 'idle' };
}
export function damageCorsair(npc, amount, attackerId) {
  if (npc.archetype !== RED_SAIL_CORSAIR.id || npc.health <= 0 || amount <= 0) return false;
  npc.health = Math.max(0, npc.health - amount);
  npc.lastAttackerId = attackerId;
  npc.state = npc.health === 0 ? 'sunk' : 'retaliating';
  return true;
}
export function updateCorsair(npc, deltaMs, targets, onFire) {
  if (npc.health <= 0 || npc.state !== 'retaliating') return;
  npc.retaliationCooldownMs = Math.max(0, npc.retaliationCooldownMs - deltaMs);
  const target = targets.get(npc.lastAttackerId);
  if (!target) return;
  const distance = Math.hypot(target.x - npc.x, target.y - npc.y);
  if (distance > RED_SAIL_CORSAIR.retaliationRange || npc.retaliationCooldownMs > 0) return;
  npc.heading = (Math.atan2(target.x - npc.x, -(target.y - npc.y)) * 180 / Math.PI + 360) % 360;
  npc.retaliationCooldownMs = RED_SAIL_CORSAIR.retaliationCooldownMs;
  onFire?.({ npc, target });
}
