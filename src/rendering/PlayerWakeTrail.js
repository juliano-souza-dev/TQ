// Pure adaptation of the wake-sampling section in the former WorldRuntime.
// The actual foam geometry/shader is unchanged in LegacyOceanWebGLRenderer.mjs.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const LEGACY_WAKE_SETTINGS = Object.freeze({
  active: true,
  scale: 1,
  opacity: .78,
  width: 66,
  length: 240,
  rate: 55,
  minSpeed: 35,
  shipHeight: 230,
  referenceSpeed: 420,
});

export class PlayerWakeTrail {
  constructor(settings = LEGACY_WAKE_SETTINGS) {
    this.settings = settings;
    this.samples = [];
    this.previous = null;
    this.lastSampleMs = -Infinity;
    this.lastTimeMs = 0;
  }

  update({ x, y, heading = 0, timeMs = 0, stepMs = 16.67 } = {}) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const now = Math.max(0, Number(timeMs) || 0);
    const dt = Math.max(.001, (Number(stepMs) || 16.67) / 1000);
    const previous = this.previous;
    const distance = previous ? Math.hypot(x - previous.x, y - previous.y) : 0;
    // Teleports, region changes and saved-position restoration must never
    // produce a screen-spanning foam ribbon.
    const plausible = distance <= Math.max(100, dt * this.settings.referenceSpeed * 3);
    const speed = plausible && previous ? distance / dt : 0;
    this.previous = { x, y };
    this.lastTimeMs = now;

    const width = this.settings.width * this.settings.scale;
    const length = this.settings.length * this.settings.scale;
    const lifetime = clamp(1100 + length * 6.2, 1600, 6200);
    this.samples = this.samples.filter(sample => now - sample.time < lifetime);

    if (!this.settings.active || speed < this.settings.minSpeed
      || now - this.lastSampleMs < this.settings.rate) return;
    this.lastSampleMs = now;

    const rad = (Number(heading) || 0) * Math.PI / 180;
    const forwardX = Math.sin(rad);
    const forwardY = -Math.cos(rad);
    const sternDistance = this.settings.shipHeight * .35 + 8;
    const sample = {
      x: x - forwardX * sternDistance,
      y: y - forwardY * sternDistance,
      heading: Number(heading) || 0,
      speedFactor: clamp(speed / this.settings.referenceSpeed, .18, 1),
      time: now,
    };
    const last = this.samples.at(-1);
    if (!last || Math.hypot(last.x - sample.x, last.y - sample.y) >= 4) {
      this.samples.push(sample);
    }

    let distanceAlongWake = 0;
    let keepFrom = Math.max(0, this.samples.length - 1);
    const maxLength = length * (.95 + sample.speedFactor * .38);
    for (let index = this.samples.length - 1; index > 0; index--) {
      const a = this.samples[index], b = this.samples[index - 1];
      distanceAlongWake += Math.hypot(a.x - b.x, a.y - b.y);
      keepFrom = index - 1;
      if (distanceAlongWake >= maxLength) break;
    }
    if (keepFrom > 0) this.samples.splice(0, keepFrom);
    if (this.samples.length > 72) this.samples.splice(0, this.samples.length - 72);
  }

  snapshot(timeMs = this.lastTimeMs) {
    const length = this.settings.length * this.settings.scale;
    return {
      active: this.settings.active,
      samples: this.samples,
      width: this.settings.width * this.settings.scale,
      opacity: this.settings.opacity,
      lifetime: clamp(1100 + length * 6.2, 1600, 6200),
    };
  }

  reset() {
    this.samples = [];
    this.previous = null;
    this.lastSampleMs = -Infinity;
    this.lastTimeMs = 0;
  }
}
