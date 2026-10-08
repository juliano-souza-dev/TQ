// Global pointer-to-world navigation. The canvas receives clicks, HUD controls do not.
export function createClickNavigation(canvas, world, onWorldClick = null) {
  let destination = null;
  const onClick = event => {
    if (event.button !== 0 || event.detail === 0) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const zoom = Math.max(world.camera.zoom, 0.01);
    const x = world.cameraView.x + (event.clientX - rect.left - rect.width / 2) / zoom;
    const y = world.cameraView.y + (event.clientY - rect.top - rect.height / 2) / zoom;
    const point = {
      x: Math.max(0, Math.min(world.region.width, x)),
      y: Math.max(0, Math.min(world.region.height, y)),
    };
    if (onWorldClick?.(point) === true) { destination = null; return; }
    destination = point;
  };
  canvas.addEventListener('click', onClick);
  return {
    getDestination: () => destination,
    cancel: () => { destination = null; },
    dispose: () => canvas.removeEventListener('click', onClick),
  };
}
