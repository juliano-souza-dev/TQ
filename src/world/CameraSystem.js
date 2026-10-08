// Camera follows the ship until its viewport reaches a region boundary.
// WASD applies a persistent camera offset, changed only while a key is held.
export function updateCamera(world, viewportWidth, viewportHeight) {
  const zoom = Math.max(world.camera.zoom, 0.01);
  const halfW = viewportWidth / (2 * zoom);
  const halfH = viewportHeight / (2 * zoom);
  const clampAxis = (value, extent, half) => extent <= 2 * half
    ? extent / 2 : Math.max(half, Math.min(extent - half, value));
  world.cameraView = {
    x: clampAxis(world.camera.x + (world.cameraOffset?.x ?? 0), world.region.width, halfW),
    y: clampAxis(world.camera.y + (world.cameraOffset?.y ?? 0), world.region.height, halfH),
  };
  return world.cameraView;
}
