// Region-independent navigation. Inputs are normalized [-1, 1].
export function advanceNavigation(world, input, deltaMs, speed = 80) {
  if (!world?.region || !world.camera) throw new TypeError('world required');
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('invalid deltaMs');
  const x = Number.isFinite(input?.x) ? input.x : 0;
  const y = Number.isFinite(input?.y) ? input.y : 0;
  const magnitude = Math.max(1, Math.hypot(x, y));
  const distance = speed * deltaMs / 1000;
  world.camera.x = Math.max(0, Math.min(world.region.width, world.camera.x + x / magnitude * distance));
  world.camera.y = Math.max(0, Math.min(world.region.height, world.camera.y + y / magnitude * distance));
}

/** Advance toward a clicked world point without overshooting. */
export function advanceTowardDestination(world, destination, deltaMs, speed = 80) {
  if (!destination) return { arrived: true, heading: null };
  const dx = destination.x - world.camera.x;
  const dy = destination.y - world.camera.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= 1) return { arrived: true, heading: null };
  const step = Math.min(distance, speed * deltaMs / 1000);
  advanceNavigation(world, { x: dx / distance, y: dy / distance }, step / speed * 1000, speed);
  return {
    arrived: distance - step <= 1,
    heading: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360,
  };
}
