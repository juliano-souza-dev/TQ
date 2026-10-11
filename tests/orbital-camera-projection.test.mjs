import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewProjection, cameraRelativeHeading } from '../src/rendering/OrbitalCameraProjection.js';

const target = { x: 2000, y: 3000 };

test('3D target is centered and world Y still points down on screen', () => {
  const camera = createViewProjection(target, 1, 1280, 720, 1, { enabled: true, yaw: 0, pitch: Math.PI / 4 });
  const center = camera.project(target);
  assert.ok(Math.abs(center.x - 640) < 1e-8);
  assert.ok(Math.abs(center.y - 360) < 1e-8);
  assert.ok(camera.project({ x: 2000, y: 3090 }).y > center.y);
});

test('perspective projection roundtrips mouse hit testing through sea surface', () => {
  for (const yaw of [0, .25, Math.PI / 2, Math.PI, 5.7]) {
    for (const pitch of [.6, .78, 1.05, 1.47]) {
      for (const zoom of [.3, .8, 1, 2.2]) {
        const camera = createViewProjection(target, zoom, 1280, 720, 1, { enabled: true, yaw, pitch });
        for (const point of [
          { x: 2000, y: 3000 }, { x: 2160, y: 2910 }, { x: 1850, y: 3080 },
        ]) {
          const screen = camera.project(point);
          if (!screen) continue;
          const world = camera.unprojectGround(screen);
          assert.ok(world, 'ground ray should intersect sea');
          assert.ok(Math.hypot(world.x - point.x, world.y - point.y) < 1e-7);
        }
      }
    }
  }
});

test('depth scales distant NPCs down and nearby NPCs up', () => {
  const camera = createViewProjection(target, 1, 1280, 720, 1, { enabled: true, yaw: 0, pitch: .8 });
  const far = camera.project({ x: 2000, y: 2800 });
  const near = camera.project({ x: 2000, y: 3200 });
  assert.ok(far.relativeScale < 1);
  assert.ok(near.relativeScale > 1);
});

test('2D fallback is pixel identical to previous linear projection', () => {
  const camera = createViewProjection(target, .75, 1280, 720, 2, { enabled: false });
  const p = camera.project({ x: 2040, y: 3020 });
  assert.equal(p.x, 640 + 40 * .75 * 2);
  assert.equal(p.y, 360 + 20 * .75 * 2);
});

test('ship frame heading tracks orbit without changing world heading', () => {
  assert.equal(cameraRelativeHeading(0, Math.PI / 2), 270);
  assert.equal(cameraRelativeHeading(90, Math.PI / 2), 0);
});
