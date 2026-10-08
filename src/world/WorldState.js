import { R1 } from './regions/r1.js';

export function createWorldState(region = R1) {
  if (!region || !Number.isFinite(region.width) || !Number.isFinite(region.height) ||
      region.width <= 0 || region.height <= 0) {
    throw new TypeError('Invalid region');
  }
  return {
    region,
    entities: new Map(),
    camera: { x: region.spawn.x, y: region.spawn.y, zoom: 0.88 },
    cameraOffset: { x: 0, y: 0 },
  };
}
