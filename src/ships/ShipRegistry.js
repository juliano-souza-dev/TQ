import { HALLOWEEN_TABUADA_SHIP } from './HalloweenTabuadaShip.js';
export { HALLOWEEN_TABUADA_SHIP };

// Catálogo consultável, independente de navios equipáveis ou entidades do mundo.
import { GOLDEN_GALLEON_SHIP } from './GoldenGalleonShip.js';
export { GOLDEN_GALLEON_SHIP };
import { ECLIPSE_SHIP } from './EclipseShip.js';
export { ECLIPSE_SHIP };
import { SHADOW_CHASER_SHIP } from './ShadowChaserShip.js';
export { SHADOW_CHASER_SHIP };
import { TERROR_DO_MAR_SHIP } from './TerrorDoMarShip.js';
export { TERROR_DO_MAR_SHIP };
import { IMPERIAL_BLACK_GALLEON_SHIP } from './ImperialBlackGalleonShip.js';
export { IMPERIAL_BLACK_GALLEON_SHIP };
import { PUMPKIN_FLEET_GALLEON_SHIP } from './PumpkinFleetGalleonShip.js';
export { PUMPKIN_FLEET_GALLEON_SHIP };
export const SHIP_CATALOG = Object.freeze([HALLOWEEN_TABUADA_SHIP, GOLDEN_GALLEON_SHIP, ECLIPSE_SHIP, SHADOW_CHASER_SHIP, PUMPKIN_FLEET_GALLEON_SHIP, IMPERIAL_BLACK_GALLEON_SHIP]);

import { FUGITIVE_FRIGATE_SHIP } from './FugitiveFrigateShip.js';
export { FUGITIVE_FRIGATE_SHIP };
import { BLOOD_RED_CORSAIR_SHIP } from './BloodRedCorsairShip.js';
export { BLOOD_RED_CORSAIR_SHIP };
// Catálogo NPC separado da frota que o jogador pode adquirir.
export const NPC_SHIP_CATALOG = Object.freeze([FUGITIVE_FRIGATE_SHIP, TERROR_DO_MAR_SHIP, BLOOD_RED_CORSAIR_SHIP]);

import { STARTER_SHIP } from './StarterShip.js';
export { STARTER_SHIP };
export { ROSE_GOLD_SHIP } from './RoseGoldShip.js';

export function getShipFrame(headingDegrees, definition = STARTER_SHIP) {
  const { framesByHeading, angleStepDegrees } = definition.sprite;
  const normalized = ((headingDegrees % 360) + 360) % 360;
  return framesByHeading[Math.round(normalized / angleStepDegrees) % framesByHeading.length];
}

export function getShipSpriteUrl(definition = STARTER_SHIP) {
  const url = new URL(definition.sprite.path, import.meta.url);
  if (globalThis.__TQ_ASSET_VERSION__) url.searchParams.set('v', globalThis.__TQ_ASSET_VERSION__);
  return url.href;
}
