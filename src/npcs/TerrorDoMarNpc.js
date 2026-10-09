import { TERROR_DO_MAR_SHIP } from '../ships/TerrorDoMarShip.js';

// Preparado para a Região 3. Não é inserido em nenhum mapa por enquanto.
export const TERROR_DO_MAR_NPC = Object.freeze({
  id: 'terror-do-mar',
  shipId: TERROR_DO_MAR_SHIP.id,
  name: TERROR_DO_MAR_SHIP.name,
  aggression: 'peaceful',
  damage: 0,
  range: 0,
  cannonSlots: 0,
  maxHealth: 500000,
});

const normalize = angle => (angle % 360 + 360) % 360;

export function createTerrorDoMar({
  id='terror-do-mar',
  x=0,
  y=0,
  heading=0,
}={}) {
  return {
    id,
    type: 'npc',
    archetype: TERROR_DO_MAR_NPC.id,
    name: TERROR_DO_MAR_NPC.name,
    shipId: TERROR_DO_MAR_NPC.shipId,
    aggression: 'peaceful',
    x,
    y,
    heading: normalize(heading),
    health: TERROR_DO_MAR_NPC.maxHealth,
    maxHealth: TERROR_DO_MAR_NPC.maxHealth,
    damage: 0,
    range: 0,
    cannonSlots: 0,
    state: 'cruising',
    speed: TERROR_DO_MAR_SHIP.speed.initial,
  };
}
