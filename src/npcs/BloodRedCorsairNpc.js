import { BLOOD_RED_CORSAIR_SHIP } from '../ships/BloodRedCorsairShip.js';

export const BLOOD_RED_MARKET_MERCHANT = Object.freeze({
  id: 'blood-red-market-merchant',
  name: 'Silas Rubro, o Mercador do Breu',
  shipId: BLOOD_RED_CORSAIR_SHIP.id,
  aggression: 'neutral',
  maxHealth: 250000,
  cannonSlots: BLOOD_RED_CORSAIR_SHIP.cannonSlots,
  interactionRadius: 180,
  tradeCategories: Object.freeze(['cannons', 'ammunition']),
});

export function createBloodRedMarketMerchant(config = {}) {
  return {
    id: config.id ?? 'r3-mercador-do-breu',
    type: 'npc',
    archetype: BLOOD_RED_MARKET_MERCHANT.id,
    name: config.name ?? BLOOD_RED_MARKET_MERCHANT.name,
    shipId: BLOOD_RED_MARKET_MERCHANT.shipId,
    x: Number(config.x) || 0,
    y: Number(config.y) || 0,
    heading: Number.isFinite(Number(config.heading)) ? Number(config.heading) : 90,
    health: BLOOD_RED_MARKET_MERCHANT.maxHealth,
    maxHealth: BLOOD_RED_MARKET_MERCHANT.maxHealth,
    state: 'merchant',
    aggression: BLOOD_RED_MARKET_MERCHANT.aggression,
    damage: 0,
    range: 0,
    cannonSlots: BLOOD_RED_MARKET_MERCHANT.cannonSlots,
    speed: 0,
    attackProtectedUntil: Infinity,
    assistDisabled: true,
    merchantKind: 'black-market',
    interactionRadius: BLOOD_RED_MARKET_MERCHANT.interactionRadius,
    tradeCategories: [...BLOOD_RED_MARKET_MERCHANT.tradeCategories],
  };
}
