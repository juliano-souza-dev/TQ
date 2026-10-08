import test from 'node:test';
import assert from 'node:assert/strict';
import { R1 } from '../src/world/regions/r1.js';
import { createWorldState } from '../src/world/WorldState.js';
import { OCEAN_VERTEX_SHADER, OCEAN_FRAGMENT_SHADER } from '../src/rendering/shaders/ocean.js';

test('R1 begins empty and shares global ocean texture', () => {
  const world = createWorldState();
  assert.equal(world.region, R1);
  assert.equal(world.entities.size, 0);
  assert.match(R1.ocean.texture, /assets\/globals\/ocean-tile-tabuada-region01\.webp$/);
  assert.ok(R1.ocean.tileSize > 0);
  assert.ok(R1.ocean.waveStrength > 0);
});

test('ocean shader exposes independent time, camera and texture uniforms', () => {
  assert.match(OCEAN_VERTEX_SHADER, /#version 300 es/);
  assert.match(OCEAN_FRAGMENT_SHADER, /uniform float uTime/);
  assert.match(OCEAN_FRAGMENT_SHADER, /uniform vec2 uCamera/);
  assert.match(OCEAN_FRAGMENT_SHADER, /uniform sampler2D uTexture/);
});
