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
