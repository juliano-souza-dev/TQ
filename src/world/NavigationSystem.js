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
