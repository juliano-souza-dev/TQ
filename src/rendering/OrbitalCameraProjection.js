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
export const PERSPECTIVE_FOV = Math.PI / 3;

// World X is screen right and world Y is screen down at yaw zero.
// Target is the projected viewport center, not the camera's physical position.
export function createPerspectiveCamera({
  target = { x: 0, y: 0 },
  yaw = 0,
  pitch = Math.PI / 4,
  distance = 1200,
  fov = PERSPECTIVE_FOV,
  viewport = { width: 1280, height: 720 },
} = {}) {
  const p = Math.max(0.60, Math.min(1.47, Number(pitch) || Math.PI / 4));
  const d = Math.max(1, Number(distance) || 1200);
  const focal = Math.max(1, viewport.height) /
    (2 * Math.tan(Math.max(0.2, Math.min(2.5, fov)) / 2));
  const sp = Math.sin(p), cp = Math.cos(p), sy = Math.sin(yaw), cy = Math.cos(yaw);
  const eye = { x: target.x - sy * d * cp, y: target.y + cy * d * cp, z: d * sp };
  const forward = { x: sy * cp, y: -cy * cp, z: -sp };
  const right = { x: cy, y: sy, z: 0 };
  const up = { x: sy * sp, y: -cy * sp, z: cp };
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  function project(point) {
    const relative = {
      x: point.x - eye.x,
      y: point.y - eye.y,
      z: (Number(point.z) || 0) - eye.z,
    };
    const depth = dot(relative, forward);
    if (depth <= 0.01) return null;
    const x = viewport.width / 2 + focal * dot(relative, right) / depth;
    const y = viewport.height / 2 - focal * dot(relative, up) / depth;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y, depth, scale: focal / depth };
  }
  function unprojectGround(screen) {
    const u = (screen.x - viewport.width / 2) / focal;
    const v = (viewport.height / 2 - screen.y) / focal;
    const ray = {
      x: forward.x + u * right.x + v * up.x,
      y: forward.y + u * right.y + v * up.y,
      z: forward.z + u * right.z + v * up.z,
    };
    if (ray.z >= -0.000001) return null;
    const t = -eye.z / ray.z;
    return { x: eye.x + ray.x * t, y: eye.y + ray.y * t };
  }
  return { eye, target, forward, right, up, focal, project, unprojectGround };
}

/**
 * One projection contract shared by DOM hit-tests, Canvas sprites and WebGL.
 * viewport dimensions are drawing-buffer pixels and zoom is game zoom.
 * No physics, collisions, combat or mission coordinates are modified.
 */
export function createViewProjection(camera, zoom, width, height, dpr = 1, orbit = null) {
  const z = Math.max(0.01, Number(zoom) || 1);
  const ratio = Math.max(0.1, Number(dpr) || 1);
  const target = { x: Number(camera?.x) || 0, y: Number(camera?.y) || 0 };
  const viewport = { width: Math.max(1, width), height: Math.max(1, height) };
  if (!orbit?.enabled) {
    return {
      enabled: false,
      project(point) {
        return {
          x: viewport.width / 2 + (point.x - target.x) * z * ratio,
          y: viewport.height / 2 + (point.y - target.y) * z * ratio,
          depth: 1, scale: z * ratio, relativeScale: 1,
        };
      },
      unprojectGround(point) {
        return {
          x: target.x + (point.x - viewport.width / 2) / (z * ratio),
          y: target.y + (point.y - viewport.height / 2) / (z * ratio),
        };
      },
    };
  }
  const focal = viewport.height / (2 * Math.tan(PERSPECTIVE_FOV / 2));
  const model = createPerspectiveCamera({
    target, yaw: Number(orbit.yaw) || 0,
    pitch: orbit.pitch, distance: focal / (z * ratio),
    fov: PERSPECTIVE_FOV, viewport,
  });
  return {
    ...model,
    enabled: true,
    project(point) {
      const projected = model.project(point);
      return projected ? { ...projected, relativeScale: projected.scale / (z * ratio) } : null;
    },
  };
}

export function cameraRelativeHeading(headingDegrees, cameraYawRadians) {
  const heading = Number(headingDegrees) || 0;
  const yawDegrees = (Number(cameraYawRadians) || 0) * 180 / Math.PI;
  return ((heading - yawDegrees) % 360 + 360) % 360;
}

/**
 * Returns a perspective sprite footprint. Anchoring at the projected water
 * contact point keeps vessels attached to the ocean while camera height moves.
 */
export function projectGroundSprite(camera3d, position, worldWidth, worldHeight) {
  const anchor = camera3d.project({ x: position.x, y: position.y, z: position.z || 0 });
  if (!anchor) return null;
  return {
    ...anchor,
    width: Math.max(0, worldWidth) * anchor.scale,
    height: Math.max(0, worldHeight) * anchor.scale,
  };
}
