import {
  HALLOWEEN_FOG_VERTEX_SHADER, HALLOWEEN_FOG_FRAGMENT_SHADER,
} from './shaders/halloweenFog.js';
import { halloweenFogOptions } from '../events/HalloweenAtmosphere.js';

function compile(gl, kind, source) {
  const shader = gl.createShader(kind);
  if (!shader) throw new Error('Não foi possível criar o shader de Halloween');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Falha desconhecida no shader';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function makeProgram(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, HALLOWEEN_FOG_VERTEX_SHADER);
  let fragment = null;
  let program = null;
  try {
    fragment = compile(gl, gl.FRAGMENT_SHADER, HALLOWEEN_FOG_FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!program) throw new Error('Não foi possível criar o programa de névoa');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Falha ao vincular o shader');
    }
    return program;
  } catch (error) {
    if (program) gl.deleteProgram(program);
    throw error;
  } finally {
    gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
  }
}

/**
 * Isolated event compositor. Does not change OceanRenderer, render entities,
 * consume ammunition or access player persistence.
 */
export class HalloweenFogRenderer {
  constructor(canvas, { getReducedMotion = () => false } = {}) {
    this.canvas = canvas;
    this.getReducedMotion = getReducedMotion;
    this.gl = null;
    this.program = null;
    this.buffer = null;
    this.position = -1;
    this.uniforms = {};
    this.ready = false;
    this.disposed = false;
    this.lastFrameAt = -Infinity;
    this.onContextLost = event => {
      event.preventDefault();
      this.ready = false;
      this.releaseGpuHandles();
    };
    this.onContextRestored = () => {
      if (!this.disposed) this.init();
    };
    canvas.addEventListener?.('webglcontextlost', this.onContextLost, false);
    canvas.addEventListener?.('webglcontextrestored', this.onContextRestored, false);
  }

  releaseGpuHandles() {
    this.program = null;
    this.buffer = null;
    this.position = -1;
    this.uniforms = {};
  }

  init() {
    if (this.disposed) return false;
    if (this.ready) return true;
    let gl = this.gl;
    if (!gl) {
      gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power',
      });
      if (!gl) return false;
      this.gl = gl;
    }
    try {
      this.program = makeProgram(gl);
      this.buffer = gl.createBuffer();
      if (!this.buffer) throw new Error('Falha ao criar buffer para névoa');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1,-1, 1,-1, -1,1,
        -1, 1, 1,-1, 1,1,
      ]), gl.STATIC_DRAW);
      this.position = gl.getAttribLocation(this.program, 'aPosition');
      if (this.position < 0) throw new Error('Atributo aPosition indisponível');
      for (const name of ['uResolution','uViewport','uCamera','uZoom','uTime','uIntensity']) {
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
        if (this.uniforms[name] === null) throw new Error('Uniforme não encontrado: ' + name);
      }
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      this.ready = true;
      this.lastFrameAt = -Infinity;
      return true;
    } catch (error) {
      console.warn('[TabuadaQuest] Shader de névoa Halloween indisponível:', error);
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.program) gl.deleteProgram(this.program);
      this.releaseGpuHandles();
      this.ready = false;
      return false;
    }
  }

  render(camera, zoom, timeMs) {
    if (!this.ready || this.disposed || !camera) return false;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    const reducedMotion = this.getReducedMotion() === true;
    const options = halloweenFogOptions(bounds.width, reducedMotion);
    if (timeMs - this.lastFrameAt < options.frameIntervalMs) return true;
    this.lastFrameAt = timeMs;

    const gl = this.gl;
    const width = Math.max(1, Math.round(bounds.width * options.resolutionScale));
    const height = Math.max(1, Math.round(bounds.height * options.resolutionScale));
    if (width !== this.canvas.width || height !== this.canvas.height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.position);
    gl.vertexAttribPointer(this.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.uniforms.uResolution, width, height);
    gl.uniform2f(this.uniforms.uViewport, bounds.width, bounds.height);
    gl.uniform2f(this.uniforms.uCamera, camera.x, camera.y);
    gl.uniform1f(this.uniforms.uZoom, Math.max(0.01, Number(zoom) || 1));
    gl.uniform1f(this.uniforms.uTime, options.animate ? (timeMs % 1800000) / 1000 : 0);
    gl.uniform1f(this.uniforms.uIntensity, options.intensity);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    this.canvas.removeEventListener?.('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener?.('webglcontextrestored', this.onContextRestored);
    if (this.gl && !this.gl.isContextLost?.()) {
      if (this.buffer) this.gl.deleteBuffer(this.buffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
    this.releaseGpuHandles();
    this.gl = null;
  }
}
