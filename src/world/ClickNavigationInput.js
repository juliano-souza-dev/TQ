// Global pointer-to-world navigation. The canvas receives clicks, HUD controls do not.
export function createClickNavigation(canvas, world) {
  let destination = null;
  const onClick = event => {
    if (event.button !== 0 || event.detail === 0) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const zoom = Math.max(world.camera.zoom, 0.01);
    const x = world.camera.x + world.cameraOffset.x + (event.clientX - rect.left - rect.width / 2) / zoom;
    const y = world.camera.y + world.cameraOffset.y + (event.clientY - rect.top - rect.height / 2) / zoom;
    destination = {
      x: Math.max(0, Math.min(world.region.width, x)),
      y: Math.max(0, Math.min(world.region.height, y)),
    };
  };
  canvas.addEventListener('click', onClick);
  return {
    getDestination: () => destination,
    cancel: () => { destination = null; },
    dispose: () => canvas.removeEventListener('click', onClick),
  };
}
