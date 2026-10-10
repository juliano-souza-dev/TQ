import { screenPointToWorld } from './WorldNavigationInput.mjs';

// Pointer gestures on the ocean only. HUD and joystick retain independent pointers.
export function createClickNavigation(canvas, world, onWorldClick = null) {
  let destination = null;
  let gesture = null;
  let suppressClick = false;
  const clamp = (value, extent, half) => extent <= 2 * half
    ? extent / 2 : Math.max(half, Math.min(extent - half, value));
  const down = event => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY, dragging: false };
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 8) {
      gesture.dragging = true;
      destination = null;
      if (!world.manualCamera) world.manualCamera = { ...world.cameraView };
    }
    if (gesture.dragging) {
      const zoom = Math.max(world.camera.zoom, 0.01);
      const halfW = canvas.clientWidth / (2 * zoom);
      const halfH = canvas.clientHeight / (2 * zoom);
      world.manualCamera.x = clamp(world.manualCamera.x - dx / zoom, world.region.width, halfW);
      world.manualCamera.y = clamp(world.manualCamera.y - dy / zoom, world.region.height, halfH);
      event.preventDefault();
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  };
  const end = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.dragging) suppressClick = true;
    gesture = null;
  };
  const onClick = event => {
    if (suppressClick) { suppressClick = false; return; }
    if (event.button !== 0 || event.detail === 0) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const zoom = Math.max(world.camera.zoom, 0.01);
    const point = screenPointToWorld(event.clientX, event.clientY, {
      viewportLeft: rect.left, viewportTop: rect.top,
      viewportWidth: rect.width, viewportHeight: rect.height,
      cameraX: world.cameraView.x, cameraY: world.cameraView.y, zoom,
      worldWidth: world.region.width, worldHeight: world.region.height,
    });
    const handled = onWorldClick?.(point);
    if (handled === true) { destination = null; return; }
    if (handled?.destination) {
      destination = {x:Number(handled.destination.x),y:Number(handled.destination.y)};
      return;
    }
    destination = point;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('click', onClick);
  return {
    getDestination: () => destination,
    setDestination: point => { destination=point?{x:Number(point.x),y:Number(point.y)}:null; },
    cancel: () => { destination = null; },
    dispose: () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('click', onClick);
    },
  };
}
