import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldState } from '../src/world/WorldState.js';
import { updateCamera } from '../src/world/CameraSystem.js';

test('camera follow shows more ocean ahead while keeping the same zoom', () => {
  const region = { width: 3000, height: 3000, spawn: {x:1500,y:1500} };
  const world = createWorldState(region);
  const zoom = world.camera.zoom;
  const view = updateCamera(world, 800, 600);
  assert.equal(zoom, .88);
  assert.equal(view.x, 1500);
  assert.equal(view.y, 1435);
  assert.equal(world.camera.y, 1500);
});

test('manual camera starts where visible view stopped, with no additional offset', () => {
  const region = { width: 3000, height: 3000, spawn:{x:1500,y:1500} };
  const world = createWorldState(region);
  const visible = updateCamera(world, 800, 600);
  world.manualCamera = {...visible};
  assert.deepEqual(updateCamera(world, 800, 600), visible);
});
