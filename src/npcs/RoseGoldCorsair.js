import { HALLOWEEN_TABUADA_SHIP } from '../ships/HalloweenTabuadaShip.js';
export const ROSE_GOLD_CORSAIR = Object.freeze({
  id: 'terror-da-tabuada',
  name: 'Terror da Tabuada',
  shipId: HALLOWEEN_TABUADA_SHIP.id,
  maxHealth: 120,
  aggression: 'retaliate',
  // Only the NPC is slower; the player's equipped ship keeps its original speed.
  speed: Object.freeze({
    min: HALLOWEEN_TABUADA_SHIP.speed.min * 0.5,
    initial: HALLOWEEN_TABUADA_SHIP.speed.initial * 0.5,
    max: HALLOWEEN_TABUADA_SHIP.speed.max * 0.5,
  }),
});
export function createRoseGoldCorsair(id, x, y, heading = 180) {
  return { id, type: 'npc', archetype: ROSE_GOLD_CORSAIR.id,
    shipId: HALLOWEEN_TABUADA_SHIP.id, name: ROSE_GOLD_CORSAIR.name,
    x, y, heading, health: ROSE_GOLD_CORSAIR.maxHealth,
    maxHealth: ROSE_GOLD_CORSAIR.maxHealth,
    lastAttackerId: null, retaliationCooldownMs: 0, state: 'idle' };
}
