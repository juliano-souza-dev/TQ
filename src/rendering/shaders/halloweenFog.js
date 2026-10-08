// Fullscreen animated mist. Camera-aligned world noise means clouds do not
// move with the viewport when the ship sails or the player pans the camera.
export const HALLOWEEN_FOG_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const HALLOWEEN_FOG_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform vec2 uViewport;
uniform vec2 uCamera;
uniform float uZoom;
uniform float uTime;
uniform float uIntensity;
out vec4 fragColor;

float rand2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = rand2(i);
  float b = rand2(i + vec2(1.0, 0.0));
  float c = rand2(i + vec2(0.0, 1.0));
  float d = rand2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float mistNoise(vec2 p) {
  float n = 0.0;
  n += 0.55 * smoothNoise(p);
  n += 0.28 * smoothNoise(p * 2.03 + 6.31);
  n += 0.17 * smoothNoise(p * 4.07 - 2.41);
  return n;
}

void main() {
  // WebGL coordinates start at the bottom left; game world Y increases down.
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  vec2 viewPosition = (uv - 0.5) * uViewport / max(uZoom, 0.01);
  vec2 world = uCamera + vec2(viewPosition.x, -viewPosition.y);

  // Very slow drift; irregular low-frequency fog banks with curled thin edges.
  vec2 wind = vec2(uTime * 0.017, -uTime * 0.009);
  vec2 position = world / 335.0 + wind;
  float broad = mistNoise(position * 0.66 + vec2(3.17, 1.82));
  float curls = mistNoise(position * 1.38 + vec2(11.9, -2.4));
  float wisps = mistNoise(position * 2.6 + vec2(uTime * 0.019, -uTime * 0.012));
  float waviness = sin(world.x * 0.0047 + world.y * 0.0027 + curls * 4.6 + uTime * 0.16);
  float clouds = smoothstep(0.39, 0.66, broad * 0.73 + curls * 0.28 + waviness * 0.075);
  float threads = smoothstep(0.48, 0.76, wisps) * clouds;
  float thinHaze = smoothstep(0.28, 0.63, broad) * 0.045;
  float body = clouds * (0.18 + curls * 0.17) + threads * 0.105;

  // Subtle drifting luminous spirit spots, mostly inside the fog banks.
  float sparks = smoothstep(0.72, 0.92, wisps) * clouds;
  float glow = smoothstep(0.42, 0.81, wisps * 0.6 + curls * 0.4) * clouds;
  vec3 deepGreen = vec3(0.045, 0.30, 0.18);
  vec3 ghostGreen = vec3(0.18, 0.91, 0.52);
  vec3 color = mix(deepGreen, ghostGreen, clamp(glow * 0.9 + threads * 0.55, 0.0, 1.0));
  color += sparks * vec3(0.055, 0.18, 0.095);

  float breath = 0.92 + 0.08 * sin(uTime * 0.37);
  float alpha = clamp((body + thinHaze + sparks * 0.07) * breath * uIntensity, 0.0, 0.42);
  fragColor = vec4(color, alpha);
}
`;
