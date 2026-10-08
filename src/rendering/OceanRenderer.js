import { OceanWebGLRenderer } from './LegacyOceanWebGLRenderer.mjs';
import { normalizeOceanConfig } from '../world/WorldOceanEffect.mjs';
import { PlayerWakeTrail } from './PlayerWakeTrail.js';

// This adapter preserves the current game's small rendering interface while
// delegating every pixel of WebGL water/foam/sparkles to the UNMODIFIED old
// OceanWebGLRenderer. Halloween mist remains an independent event overlay.
export class OceanRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.legacy = new OceanWebGLRenderer(canvas);
    this.wake = new PlayerWakeTrail();
    this.ready = false;
    this.fallback = false;
    this.source = '';
    this.cachedOceanSource = null;
    this.cachedOceanConfig = null;
  }

  async init(source) {
    this.source = String(source || '');
    if (!this.source) throw new Error('Textura do oceano não configurada');
    const ready = await this.legacy.init(this.source);
    this.ready = ready === true;
    if (!this.ready) {
      // The former project had a CSS ocean fallback. Preserve that behavior
      // without importing its old DOM, which would collide with this game's UI.
      this.fallback = true;
      this.canvas.style.backgroundImage = 'url("' + this.source.replace(/["\\]/g, '') + '")';
      this.canvas.style.backgroundSize = '590px auto';
      this.canvas.style.backgroundRepeat = 'repeat';
      this.canvas.style.backgroundColor = '#0875a7';
      console.warn('[TabuadaQuest] Using old ocean texture without WebGL2');
    }
    return true;
  }

  updatePlayerWake(player, stepMs, timeMs) {
    if (!player) return;
    this.wake.update({
      x: player.x, y: player.y, heading: player.heading,
      stepMs, timeMs,
    });
  }

  render(world, timeMs) {
    if (!this.ready) return false;
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;

    const oceanSource = world.region.ocean;
    if (oceanSource !== this.cachedOceanSource) {
      this.cachedOceanSource = oceanSource;
      this.cachedOceanConfig = normalizeOceanConfig(oceanSource);
    }
    return this.legacy.render({
      time: timeMs,
      camera: world.cameraView ?? world.camera,
      zoom: world.camera.zoom,
      ocean: this.cachedOceanConfig,
      width: bounds.width,
      height: bounds.height,
      wake: this.wake.snapshot(timeMs),
    });
  }

  getDiagnostics() {
    return this.legacy.getDiagnostics();
  }

  dispose() {
    this.ready = false;
    this.wake.reset();
    this.legacy.destroy();
    this.cachedOceanConfig = null;
    this.cachedOceanSource = null;
    this.canvas.style.backgroundImage = '';
  }
}
