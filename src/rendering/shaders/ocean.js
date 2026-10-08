// Ocean-only shaders. Coordinates are anchored to the world, not the viewport.
export const OCEAN_VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUV;
void main() {
  vUV = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const OCEAN_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uCamera;
uniform vec2 uFlow;
uniform float uZoom;
uniform float uTime;
uniform float uTileSize;
uniform float uWaveStrength;

void main() {
  vec2 centered = (vUV - 0.5) * vec2(1.0, -1.0);
  vec2 world = uCamera + centered * uResolution / max(uZoom, 0.01);
  vec2 base = world / max(uTileSize, 1.0);
  float t = uTime;
  float waveA = sin(base.y * 15.0 + base.x * 6.0 + t * 0.72);
  float waveB = cos(base.x * 19.0 - base.y * 8.0 + t * 0.54);
  vec2 distortion = vec2(waveA, waveB) * uWaveStrength;
  vec2 flow = uFlow * t;
  vec3 deep = texture(uTexture, fract(base + flow * 0.18 + distortion * 0.45)).rgb;
  vec3 surface = texture(uTexture, fract(base * 1.38 + flow * 0.32 + distortion)).rgb;
  float crest = smoothstep(0.30, 0.95, waveA * 0.5 + waveB * 0.25 + 0.5);
  vec3 water = mix(deep, surface, 0.26 + crest * 0.16);
  water += vec3(0.025, 0.06, 0.075) * crest;
  fragColor = vec4(water, 1.0);
}`;
