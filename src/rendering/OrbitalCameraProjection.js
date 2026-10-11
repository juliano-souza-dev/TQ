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

export function createOrbitalCameraController(initial = {}) {
  const state = {
    yaw: Number(initial.yaw) || 0,
    pitch: clampOrbitPitch(initial.pitch ?? ORBIT_DEFAULTS.pitch),
  };
  return {
    state,
    rotate(deltaRadians) {
      if (!Number.isFinite(deltaRadians)) return state;
      state.yaw = ((state.yaw + deltaRadians + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      return state;
    },
    tilt(deltaRadians) {
      if (!Number.isFinite(deltaRadians)) return state;
      state.pitch = clampOrbitPitch(state.pitch + deltaRadians);
      return state;
    },
    reset() {
      state.yaw = ORBIT_DEFAULTS.yaw;
      state.pitch = ORBIT_DEFAULTS.pitch;
      return state;
    },
  };
}

/**
 * Apply the same ground-plane transform to every visual layer.
 * Call only after screen-space HUD and hit-testing have been migrated.
 * The existing gameplay camera and world positions are deliberately untouched.
 */
export function orbitalGroundTransform(ctx, viewport, orbit = ORBIT_DEFAULTS) {
  const yaw = Number(orbit.yaw) || 0;
  const pitch = clampOrbitPitch(orbit.pitch);
  const c = Math.cos(yaw), s = Math.sin(yaw), squash = Math.sin(pitch);
  ctx.translate(viewport.width / 2, viewport.height / 2);
  ctx.transform(c * 1, s * squash, -s, c * squash, 0, 0);
  ctx.translate(-viewport.width / 2, -viewport.height / 2);
}

/**
 * Screen-space transform for a complete composited frame.
 * Unlike changing only ship/terrain coordinates, this keeps existing 2D
 * rendering layers visually aligned. Interaction coordinates must be inverted
 * with unprojectOrbitPoint before gameplay hit testing.
 */
export function orbitScreenTransform(point, viewport, orbit = ORBIT_DEFAULTS) {
  const yaw = Number(orbit.yaw) || 0;
  const pitch = clampOrbitPitch(orbit.pitch);
  const dx = point.x - viewport.width / 2;
  const dy = point.y - viewport.height / 2;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return {
    x: viewport.width / 2 + dx * c - dy * s,
    y: viewport.height / 2 + (dx * s + dy * c) * Math.sin(pitch),
  };
}
export function unorbitScreenTransform(point, viewport, orbit = ORBIT_DEFAULTS) {
  const yaw = Number(orbit.yaw) || 0;
  const pitch = clampOrbitPitch(orbit.pitch);
  const dx = point.x - viewport.width / 2;
  const dy = (point.y - viewport.height / 2) / Math.sin(pitch);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return {
    x: viewport.width / 2 + dx * c + dy * s,
    y: viewport.height / 2 - dx * s + dy * c,
  };
}

/**
 * Perspective projection onto the horizontal game world (z = 0).
 * Camera position and target are expressed in existing world units.
 * This is a pinhole camera, not a post-processing CSS distortion.
 */
export function createPerspectiveCamera({
  target = { x: 0, y: 0 },
  yaw = 0,
  pitch = Math.PI / 4,
  distance = 1200,
  fov = Math.PI / 3,
  viewport = { width: 1280, height: 720 },
} = {}) {
  const p = clampOrbitPitch(pitch);
  const d = Math.max(1, Number(distance) || 1200);
  const focal = Math.max(1, viewport.height) / (2 * Math.tan(Math.max(0.2, Math.min(2.5, fov)) / 2));
  const sy = Math.sin(p), cy = Math.cos(p), ca = Math.cos(yaw), sa = Math.sin(yaw);
  const eye = {
    x: target.x - sa * d * cy,
    y: target.y - ca * d * cy,
    z: d * sy,
  };
  const forward = { x: sa * cy, y: ca * cy, z: -sy };
  const right = { x: ca, y: -sa, z: 0 };
  const up = {
    x: sa * sy,
    y: ca * sy,
    z: cy,
  };
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  function project(point) {
    const relative = {
      x: point.x - eye.x,
      y: point.y - eye.y,
      z: (point.z || 0) - eye.z,
    };
    const depth = dot(relative, forward);
    if (depth <= 0.01) return null;
    return {
      x: viewport.width / 2 + focal * dot(relative, right) / depth,
      y: viewport.height / 2 - focal * dot(relative, up) / depth,
      depth,
      scale: focal / depth,
    };
  }
  function unprojectGround(screen) {
    const ray = {
      x: forward.x + (screen.x - viewport.width / 2) / focal * right.x -
        (screen.y - viewport.height / 2) / focal * up.x,
      y: forward.y + (screen.x - viewport.width / 2) / focal * right.y -
        (screen.y - viewport.height / 2) / focal * up.y,
      z: forward.z - (screen.y - viewport.height / 2) / focal * up.z,
    };
    if (ray.z >= -1e-6) return null; // Above horizon: no ground intersection.
    const t = -eye.z / ray.z;
    return { x: eye.x + ray.x * t, y: eye.y + ray.y * t };
  }
  return { eye, target, forward, right, up, focal, project, unprojectGround };
}
