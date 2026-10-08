import { ROSE_GOLD_SHIP } from '../ships/RoseGoldShip.js';
export const ROSE_GOLD_CORSAIR = Object.freeze({
  id: 'rose-gold-corsair',
  name: 'Corsário das Rosas de Ouro',
  shipId: ROSE_GOLD_SHIP.id,
  maxHealth: 120,
  aggression: 'retaliate',
  speed: ROSE_GOLD_SHIP.speed,
});
export function createRoseGoldCorsair(id, x, y, heading = 180) {
  return { id, type: 'npc', archetype: ROSE_GOLD_CORSAIR.id,
    shipId: ROSE_GOLD_SHIP.id, name: ROSE_GOLD_CORSAIR.name,
    x, y, heading, health: ROSE_GOLD_CORSAIR.maxHealth,
    maxHealth: ROSE_GOLD_CORSAIR.maxHealth,
    lastAttackerId: null, retaliationCooldownMs: 0, state: 'idle' };
}
