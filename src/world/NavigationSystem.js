import { resolveIslandMovement } from './IslandCollision.js';

// Region-independent navigation. Inputs are normalized [-1, 1].
export function advanceNavigation(world, input, deltaMs, speed = 80) {
  if (!world?.region || !world.camera) throw new TypeError('world required');
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('invalid deltaMs');
  const x = Number.isFinite(input?.x) ? input.x : 0;
  const y = Number.isFinite(input?.y) ? input.y : 0;
  const magnitude = Math.max(1, Math.hypot(x, y));
  const distance = speed * deltaMs / 1000;
  const nextX = Math.max(0, Math.min(world.region.width, world.camera.x + x / magnitude * distance));
  const nextY = Math.max(0, Math.min(world.region.height, world.camera.y + y / magnitude * distance));
  const resolved = resolveIslandMovement(world.region, world.camera.x, world.camera.y, nextX, nextY);
  world.camera.x = resolved.x;
  world.camera.y = resolved.y;
}

/** Advance toward a clicked world point without overshooting. */
export function advanceTowardDestination(world, destination, deltaMs, speed = 80) {
  if (!destination) return { arrived: true, heading: null };
  const dx = destination.x - world.camera.x;
  const dy = destination.y - world.camera.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1) return { arrived: true, heading: null };
  const step = Math.min(distance, speed * deltaMs / 1000);
  const beforeX = world.camera.x;
  const beforeY = world.camera.y;
  advanceNavigation(world, { x: dx / distance, y: dy / distance }, step / speed * 1000, speed);
  const blocked = Math.hypot(world.camera.x - beforeX, world.camera.y - beforeY) < 0.001;
  return {
    arrived: blocked || distance - step <= 1,
    heading: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360,
  };
}
