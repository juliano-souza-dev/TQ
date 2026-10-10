import { TERROR_DO_MAR_SHIP } from '../ships/TerrorDoMarShip.js';

export const TERROR_DO_MAR_NPC = Object.freeze({
  id: 'terror-do-mar',
  shipId: TERROR_DO_MAR_SHIP.id,
  name: TERROR_DO_MAR_SHIP.name,
  captainName: 'Capitão Varkor Tenebris',
  displayName: 'Terror do Mar · Capitão Varkor Tenebris',
  aggression: 'attack',
  damage: 12,
  range: 520,
  cannonSlots: TERROR_DO_MAR_SHIP.cannonSlots,
  maxHealth: TERROR_DO_MAR_SHIP.maxHealth,
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
    name: TERROR_DO_MAR_NPC.displayName,
    captainName: TERROR_DO_MAR_NPC.captainName,
    shipId: TERROR_DO_MAR_NPC.shipId,
    aggression: TERROR_DO_MAR_NPC.aggression,
    x,
    y,
    heading: normalize(heading),
    health: TERROR_DO_MAR_NPC.maxHealth,
    maxHealth: TERROR_DO_MAR_NPC.maxHealth,
    damage: TERROR_DO_MAR_NPC.damage,
    range: TERROR_DO_MAR_NPC.range,
    cannonSlots: TERROR_DO_MAR_NPC.cannonSlots,
    state: 'retaliating',
    speed: TERROR_DO_MAR_SHIP.speed.initial,
  };
}
