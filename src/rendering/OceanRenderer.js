import { OCEAN_VERTEX_SHADER, OCEAN_FRAGMENT_SHADER } from './shaders/ocean.js';

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Ocean shader: ' + message);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, OCEAN_VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, OCEAN_FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Ocean program: ' + message);
  }
  return program;
}

// Renders only water. No knowledge of ships, input, missions or persistence.
export class OceanRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      powerPreference: 'high-performance',
    });
    if (!this.gl) throw new Error('WebGL2 indisponível neste dispositivo');
    this.program = null;
    this.texture = null;
    this.buffer = null;
    this.uniforms = {};
    this.ready = false;
  }

  async init(source) {
    const gl = this.gl;
    this.program = createProgram(gl);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    await new Promise((resolve, reject) => {
      if (image.complete && image.naturalWidth) return resolve();
      image.onload = resolve;
      image.onerror = () => reject(new Error('Falha ao carregar textura do oceano: ' + source));
    });
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.useProgram(this.program);
    for (const name of ['uTexture', 'uResolution', 'uCamera', 'uFlow', 'uZoom', 'uTime', 'uTileSize', 'uWaveStrength']) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    gl.uniform1i(this.uniforms.uTexture, 0);
    this.ready = true;
  }

  render(world, timeMs) {
    if (!this.ready) return;
    const gl = this.gl;
    const bounds = this.canvas.getBoundingClientRect();
    const mobile = Math.min(bounds.width, bounds.height) < 900;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const location = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    const ocean = world.region.ocean;
    gl.uniform2f(this.uniforms.uResolution, bounds.width, bounds.height);
    gl.uniform2f(this.uniforms.uCamera, world.cameraView.x, world.cameraView.y);
    gl.uniform2f(this.uniforms.uFlow, ocean.flowX, ocean.flowY);
    gl.uniform1f(this.uniforms.uZoom, world.camera.zoom);
    gl.uniform1f(this.uniforms.uTime, timeMs / 1000);
    gl.uniform1f(this.uniforms.uTileSize, ocean.tileSize);
    gl.uniform1f(this.uniforms.uWaveStrength, ocean.waveStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.program) gl.deleteProgram(this.program);
    this.ready = false;
  }
}
