import { STARTER_SHIP } from './StarterShip.js';

export const STARTER_SHIP = Object.freeze(starter);

export function getShipFrame(headingDegrees, definition = STARTER_SHIP) {
  const { framesByHeading, angleStepDegrees } = definition.sprite;
  const normalized = ((headingDegrees % 360) + 360) % 360;
  return framesByHeading[Math.round(normalized / angleStepDegrees) % framesByHeading.length];
}

export function getShipSpriteUrl(definition = STARTER_SHIP) {
  return new URL(definition.sprite.path, import.meta.url).href;
}
