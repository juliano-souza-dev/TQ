import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HALLOWEEN_ATMOSPHERE, halloweenFogOptions,
  isHalloweenAtmosphereActive,
} from '../src/events/HalloweenAtmosphere.js';
import {
  HALLOWEEN_FOG_VERTEX_SHADER, HALLOWEEN_FOG_FRAGMENT_SHADER,
} from '../src/rendering/shaders/halloweenFog.js';
import { HalloweenFogRenderer } from '../src/rendering/HalloweenFogRenderer.js';

function stubWebGL() {
  const calls = [];
  let shaderOk = true;
  const gl = new Proxy({
    getShaderParameter: () => shaderOk,
    getProgramParameter: () => true,
    getAttribLocation: () => 0,
    getUniformLocation: (_p, name) => name,
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    getShaderInfoLog: () => 'compile failed',
    drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    uniform2f: (name, a, b) => calls.push(['uniform2f', name, a, b]),
    uniform1f: (name, value) => calls.push(['uniform1f', name, value]),
    deleteProgram: () => calls.push(['deleteProgram']),
    deleteBuffer: () => calls.push(['deleteBuffer']),
    isContextLost: () => false,
  }, {
    get(target, name) {
      if (name in target) return target[name];
      if (typeof name === 'string' && name === name.toUpperCase()) return name;
      return (...args) => { calls.push([name, ...args]); };
    },
  });
  return { gl, calls, setShaderOk: value => { shaderOk = value; } };
}

function stubCanvas(gl, width = 1200, height = 800) {
  const listeners = new Map();
  const canvas = {
    width: 0, height: 0,
    getContext: kind => kind === 'webgl2' ? gl : null,
    getBoundingClientRect: () => ({ width, height }),
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  };
  return { canvas, listeners };
}

test('seasonal feature switch is the sole visual activation gate', () => {
  assert.equal(isHalloweenAtmosphereActive({ halloween: true }), true);
  assert.equal(isHalloweenAtmosphereActive({ halloween: false }), false);
  assert.equal(isHalloweenAtmosphereActive({}), false);
  assert.equal(isHalloweenAtmosphereActive(null), false);
});

test('mobile frame rate, resolution and opacity stay below desktop cost', () => {
  const desktop = halloweenFogOptions(1440);
  const mobile = halloweenFogOptions(390);
  assert.ok(mobile.resolutionScale < desktop.resolutionScale);
  assert.ok(mobile.intensity < desktop.intensity);
  assert.ok(mobile.frameIntervalMs > desktop.frameIntervalMs);
  assert.equal(mobile.resolutionScale, HALLOWEEN_ATMOSPHERE.mobileResolutionScale);
  const reduced = halloweenFogOptions(390, true);
  assert.equal(reduced.animate, false);
  assert.ok(reduced.frameIntervalMs >= mobile.frameIntervalMs);
});

test('GLSL fog samples world coordinates with game-camera pan and zoom', () => {
  assert.match(HALLOWEEN_FOG_VERTEX_SHADER, /#version 300 es/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER, /#version 300 es/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER, /uCamera/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER, /uZoom/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER, /vec2 world/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER, /fragColor = vec4\(color, alpha\)/);
});

test('render draws real translucent GL pixels and follows camera coordinates', () => {
  const { gl, calls } = stubWebGL();
  const { canvas } = stubCanvas(gl);
  const renderer = new HalloweenFogRenderer(canvas);
  assert.equal(renderer.init(), true);
  assert.equal(renderer.render({ x: 800, y: 1300 }, 1.4, 1000), true);
  assert.equal(canvas.width, Math.round(1200 * .72));
  assert.ok(calls.some(row => row[0] === 'drawArrays'));
  assert.ok(calls.some(row => row[0] === 'uniform2f' && row[1] === 'uCamera'
    && row[2] === 800 && row[3] === 1300));
  assert.ok(calls.some(row => row[0] === 'uniform1f' && row[1] === 'uZoom'
    && row[2] === 1.4));
  const drawn = calls.filter(row => row[0] === 'drawArrays').length;
  renderer.render({ x: 900, y: 1300 }, 1.4, 1010);
  assert.equal(calls.filter(row => row[0] === 'drawArrays').length, drawn,
    'do not waste GPU cycles above mobile/desktop frame budget');
  renderer.render({ x: 900, y: 1300 }, 1.4, 1060);
  assert.equal(calls.filter(row => row[0] === 'drawArrays').length, drawn + 1);
  renderer.dispose();
  assert.ok(calls.some(row => row[0] === 'deleteProgram'));
  assert.equal(renderer.render({ x: 900, y: 1300 }, 1.4, 2000), false);
});

test('shader compilation failure preserves gameplay via harmless fallback', () => {
  const { gl, setShaderOk } = stubWebGL();
  setShaderOk(false);
  const { canvas } = stubCanvas(gl, 390, 720);
  const renderer = new HalloweenFogRenderer(canvas);
  assert.equal(renderer.init(), false);
  assert.equal(renderer.render({ x: 0, y: 0 }, 1, 200), false);
  renderer.dispose();
});

test('context loss pauses draw calls and can restore resources safely', () => {
  const { gl, calls } = stubWebGL();
  const { canvas, listeners } = stubCanvas(gl);
  const renderer = new HalloweenFogRenderer(canvas);
  assert.equal(renderer.init(), true);
  let prevented = false;
  listeners.get('webglcontextlost')({
    preventDefault: () => { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(renderer.ready, false);
  const before = calls.filter(row => row[0] === 'drawArrays').length;
  assert.equal(renderer.render({ x: 0, y: 0 }, 1, 2000), false);
  assert.equal(calls.filter(row => row[0] === 'drawArrays').length, before);
  listeners.get('webglcontextrestored')();
  assert.equal(renderer.ready, true);
  renderer.dispose();
  assert.equal(listeners.size, 0);
});
