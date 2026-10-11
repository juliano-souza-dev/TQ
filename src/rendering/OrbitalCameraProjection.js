// Shared, reversible orbital camera projection for the 2.5D world.
// World coordinates, collision, navigation and weapon ranges remain in XY.
export const ORBIT_DEFAULTS = Object.freeze({ yaw: 0, pitch: Math.PI / 4 });
export function clampOrbitPitch(pitch) {
  return Math.max(Math.PI / 9, Math.min(Math.PI * 0.47, Number(pitch) || ORBIT_DEFAULTS.pitch));
}
export function projectOrbitPoint(point, camera, viewport, orbit = ORBIT_DEFAULTS) {
  const yaw = Number(orbit.yaw) || 0;
  const pitch = clampOrbitPitch(orbit.pitch);
  const zoom = Math.max(0.001, Number(camera.zoom) || 1);
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return {
    x: viewport.width / 2 + (dx * c - dy * s) * zoom,
    y: viewport.height / 2 + (dx * s + dy * c) * zoom * Math.sin(pitch),
  };
}
export function unprojectOrbitPoint(screen, camera, viewport, orbit = ORBIT_DEFAULTS) {
  const yaw = Number(orbit.yaw) || 0;
  const pitch = clampOrbitPitch(orbit.pitch);
  const zoom = Math.max(0.001, Number(camera.zoom) || 1);
  const x = (screen.x - viewport.width / 2) / zoom;
  const y = (screen.y - viewport.height / 2) / (zoom * Math.sin(pitch));
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: camera.x + x * c + y * s, y: camera.y - x * s + y * c };
}
