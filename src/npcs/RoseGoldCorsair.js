import { HALLOWEEN_TABUADA_SHIP } from '../ships/HalloweenTabuadaShip.js';
export const ROSE_GOLD_CORSAIR = Object.freeze({
  id: 'terror-da-tabuada',
  name: 'Terror da Tabuada',
  shipId: HALLOWEEN_TABUADA_SHIP.id,
  maxHealth: 120,
  aggression: 'retaliate',
  speed: HALLOWEEN_TABUADA_SHIP.speed,
});
export function createRoseGoldCorsair(id, x, y, heading = 180) {
  return { id, type: 'npc', archetype: ROSE_GOLD_CORSAIR.id,
    shipId: HALLOWEEN_TABUADA_SHIP.id, name: ROSE_GOLD_CORSAIR.name,
    x, y, heading, health: ROSE_GOLD_CORSAIR.maxHealth,
    maxHealth: ROSE_GOLD_CORSAIR.maxHealth,
    lastAttackerId: null, retaliationCooldownMs: 0, state: 'idle' };
}
