// Camera viewport: manual WASD position is independent of ship navigation.
export function updateCamera(world, viewportWidth, viewportHeight) {
  const zoom = Math.max(world.camera.zoom, 0.01);
  const halfW = viewportWidth / (2 * zoom);
  const halfH = viewportHeight / (2 * zoom);
  const clampAxis = (value, extent, half) => extent <= 2 * half
    ? extent / 2 : Math.max(half, Math.min(extent - half, value));
  const target = world.manualCamera ?? world.camera;
  world.cameraView = {
    x: clampAxis(target.x, world.region.width, halfW),
    y: clampAxis(target.y, world.region.height, halfH),
  };
  return world.cameraView;
}
