// Camera follows the ship until its viewport reaches a region boundary.
// The viewport follows only the player ship; NPC motion never changes it.
export function updateCamera(world, viewportWidth, viewportHeight) {
  const zoom = Math.max(world.camera.zoom, 0.01);
  const halfW = viewportWidth / (2 * zoom);
  const halfH = viewportHeight / (2 * zoom);
  const clampAxis = (value, extent, half) => extent <= 2 * half
    ? extent / 2 : Math.max(half, Math.min(extent - half, value));
  world.cameraView = {
    x: clampAxis(world.camera.x, world.region.width, halfW),
    y: clampAxis(world.camera.y, world.region.height, halfH),
  };
  return world.cameraView;
}
