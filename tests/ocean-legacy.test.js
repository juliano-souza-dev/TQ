import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { R1 } from '../src/world/regions/r1.js';
import { R3 } from '../src/world/regions/r3.js';
import { OceanRenderer } from '../src/rendering/OceanRenderer.js';
import { OceanWebGLRenderer } from '../src/rendering/LegacyOceanWebGLRenderer.mjs';
import { normalizeOceanConfig } from '../src/world/WorldOceanEffect.mjs';
import { PlayerWakeTrail } from '../src/rendering/PlayerWakeTrail.js';

const EXPECTED_GIT_BLOB_SHA = '005c2a584f5d7722f632d8674acb02fd555a33b6';

function fakeGL() {
  const calls = [];
  const defaults = {
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    createTexture: () => ({}),
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getAttribLocation: (_, name) => name === 'aPosition' ? 0 : 1,
    getUniformLocation: (_, name) => name,
    drawArrays: (...args) => { calls.push(['drawArrays', ...args]); },
    uniform1f: (...args) => { calls.push(['uniform1f', ...args]); },
    uniform2f: (...args) => { calls.push(['uniform2f', ...args]); },
    uniform3f: (...args) => { calls.push(['uniform3f', ...args]); },
    uniform4f: (...args) => { calls.push(['uniform4f', ...args]); },
    shaderSource: (_, source) => { calls.push(['shaderSource', source]); },
    bufferSubData: (...args) => { calls.push(['bufferSubData', ...args]); },
  };
  const gl = new Proxy(defaults, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && key.toUpperCase() === key) return key;
      return () => {};
    },
  });
  return { gl, calls };
}
function fakeCanvas(gl) {
  return {
    width: 0,
    height: 0,
    style: {},
    getContext: name => name === 'webgl2' ? gl : null,
    getBoundingClientRect: () => ({ width: 800, height: 600 }),
  };
}
function mockImage() {
  return class FakeImage {
    naturalWidth = 1024;
    naturalHeight = 1024;
    width = 1024;
    height = 1024;
    set src(path) { this.path = path; this.onload?.(); }
  };
}

test('R1 uses exactly the original texture bytes (same Git blob SHA)', () => {
  const data = readFileSync(new URL('../assets/globals/ocean-tile-tabuada-region01.webp', import.meta.url));
  const blob = createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
  assert.equal(blob, EXPECTED_GIT_BLOB_SHA);
  assert.match(R1.ocean.texture, /ocean-tile-tabuada-region01\.webp/);
});

test('R1 parameters reproduce original calm-profile ocean from its old world JSON', () => {
  const ocean = normalizeOceanConfig(R1.ocean);
  const original = {
    preset: 'calm', renderer: 'webgl', speed: 58,
    directionX: 1, directionY: .68, swell: 55, tileSize: 590,
    brightness: 62, saturation: 62, contrast: 72,
    tintR: 84, tintG: 79, tintB: 99, distortion: 20,
    waveFrequencyA: 24, waveFrequencyB: 29,
    waveMix: 56, foamMix: 48,
    sparkleIntensity: 18, sparkleSharpness: 32,
  };
  for (const [key, value] of Object.entries(original)) assert.equal(ocean[key], value, key);
  assert.equal(ocean.layers.deep.tileScale, 1.18);
  assert.equal(ocean.layers.wave.opacity, .34);
  assert.equal(ocean.layers.foam.opacity, .2);
});

test('original renderer uses the unmodified old wave/foam/sparkle fragment shader', async () => {
  const oldImage = globalThis.Image;
  try {
    globalThis.Image = mockImage();
    const { gl, calls } = fakeGL();
    const canvas = fakeCanvas(gl);
    const renderer = new OceanWebGLRenderer(canvas);
    assert.equal(await renderer.init(R1.ocean.texture), true);
    const shaders = calls.filter(call => call[0] === 'shaderSource').map(call => call[1]);
    assert.ok(shaders.some(source => source.includes('uSparkleSharpness') && source.includes('uvFoam')));
    assert.ok(shaders.some(source => source.includes('uWakeZoom') && source.includes('vWorld')));
    renderer.destroy();
  } finally {
    if (oldImage === undefined) delete globalThis.Image;
    else globalThis.Image = oldImage;
  }
});

test('ocean adapter forwards exact settings, camera projection and moving wake to old WebGL', async () => {
  const oldImage = globalThis.Image;
  try {
    globalThis.Image = mockImage();
    const { gl, calls } = fakeGL();
    const canvas = fakeCanvas(gl);
    const renderer = new OceanRenderer(canvas);
    assert.equal(await renderer.init(R1.ocean.texture), true);
    renderer.updatePlayerWake({ x: 150, y: 230, heading: 90 }, 60, 1000);
    renderer.updatePlayerWake({ x: 171, y: 230, heading: 90 }, 60, 1060);
    renderer.updatePlayerWake({ x: 192, y: 230, heading: 90 }, 60, 1120);
    const rendered = renderer.render({
      region: R1,
      camera: { x: 190, y: 235, zoom: 1.2 },
      cameraView: { x: 210, y: 250 },
    }, 1140);
    assert.equal(rendered, true);
    const uniform = (kind, name) => calls.find(row => row[0] === kind && row[1] === name);
    assert.deepEqual(uniform('uniform2f', 'uCamera'), ['uniform2f', 'uCamera', 210, 250]);
    assert.deepEqual(uniform('uniform2f', 'uDirection'), ['uniform2f', 'uDirection', 1, .68]);
    assert.deepEqual(uniform('uniform1f', 'uZoom'), ['uniform1f', 'uZoom', 1.2]);
    assert.deepEqual(uniform('uniform1f', 'uBrightness'), ['uniform1f', 'uBrightness', .62]);
    assert.deepEqual(uniform('uniform1f', 'uSwell'), ['uniform1f', 'uSwell', 55]);
    assert.deepEqual(uniform('uniform1f', 'uFoamMix'), ['uniform1f', 'uFoamMix', 48]);
    assert.deepEqual(uniform('uniform1f', 'uWaveMix'), ['uniform1f', 'uWaveMix', 56]);
    assert.deepEqual(uniform('uniform1f', 'uSparkleIntensity'), ['uniform1f', 'uSparkleIntensity', 18]);
    assert.ok(renderer.wake.samples.length >= 2);
    assert.ok(calls.filter(call => call[0] === 'drawArrays').length >= 2,
      'one draw for the original ocean and another for its wake geometry');
    assert.ok(calls.some(row => row[0] === 'bufferSubData'));
    renderer.dispose();
    assert.equal(renderer.ready, false);
    assert.equal(renderer.wake.samples.length, 0);
  } finally {
    if (oldImage === undefined) delete globalThis.Image;
    else globalThis.Image = oldImage;
  }
});

test('wake cannot draw huge ribbons after teleports', () => {
  const trail = new PlayerWakeTrail();
  trail.update({ x: 100, y: 100, heading: 0, timeMs: 100, stepMs: 16 });
  trail.update({ x: 120, y: 100, heading: 0, timeMs: 160, stepMs: 60 });
  const before = trail.samples.length;
  trail.update({ x: 3500, y: 3200, heading: 0, timeMs: 220, stepMs: 60 });
  assert.equal(trail.samples.length, before);
  trail.reset();
  assert.equal(trail.samples.length, 0);
});

test('old texture is still shown if the legacy WebGL context cannot initialize', async () => {
  const canvas = fakeCanvas(null);
  const renderer = new OceanRenderer(canvas);
  assert.equal(await renderer.init(R1.ocean.texture), true);
  assert.equal(renderer.fallback, true);
  assert.match(canvas.style.backgroundImage, /ocean-tile-tabuada-region01\.webp/);
  renderer.dispose();
});


test('R3 forwards organic corruption zones to the ocean shader', async () => {
  const oldImage = globalThis.Image;
  try {
    globalThis.Image = mockImage();
    const { gl, calls } = fakeGL();
    const renderer = new OceanRenderer(fakeCanvas(gl));
    assert.equal(await renderer.init(R3.ocean.texture), true);
    assert.equal(renderer.render({
      region:R3,
      camera:{x:2100,y:2900,zoom:1},
      cameraView:{x:2100,y:2900},
    }, 4000), true);

    const uniform1 = name => calls.find(row => row[0] === 'uniform1f' && row[1] === name);
    const uniform3 = name => calls.find(row => row[0] === 'uniform3f' && row[1] === name);
    const uniform4 = name => calls.find(row => row[0] === 'uniform4f' && row[1] === name);
    assert.deepEqual(uniform1('uCorruptionEnabled'), ['uniform1f','uCorruptionEnabled',1]);
    assert.ok(uniform3('uCorruptionColor'));
    assert.deepEqual(uniform4('uCorruptionZone0').slice(2), [3220,3450,1450,1]);
    assert.deepEqual(uniform4('uCorruptionZone3').slice(2), [1220,1260,900,.48]);
    renderer.dispose();
  } finally {
    if (oldImage === undefined) delete globalThis.Image;
    else globalThis.Image = oldImage;
  }
});
