import { getShipFrame, getShipSpriteUrl, STARTER_SHIP } from '../ships/ShipRegistry.js';

function getVisualScale(definition) {
  if (definition.id === STARTER_SHIP.id) return 0.95625;
  if (definition.id === 'galeao-rosas-de-ouro') return 0.82;
  if (definition.id === 'galeao-halloween-tabuada') return 0.9;
  if (definition.id === 'fragata-sombra-cacadora') return 0.7;
  if (definition.id === 'terror-do-mar') return 1.1;
  return 1;
}

// Calculate one visual size for both drawing and cannon hardpoint projection.
// Widths are device pixels. Caps are CSS pixels, scaled by devicePixelRatio.
export function playerShipPixelSize(viewportW, viewportH, dpr, zoom, definition = STARTER_SHIP) {
  const compact = viewportW / Math.max(1, dpr) < 700;
  const cap = (compact ? 113 : 160) * dpr;
  return Math.min(viewportW * .30, viewportH * .30, cap)
    * getVisualScale(definition) * zoom;
}

// Dedicated transparent canvas: ocean renderer remains exclusively responsible for water.
export class ShipRenderer {
  constructor(canvas, definition = STARTER_SHIP) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.definition = definition;
    this.image = new Image();
  }
  async init() {
    const image = this.image;
    image.src = getShipSpriteUrl(this.definition);
    await new Promise((resolve, reject) => {
      if (image.complete && image.naturalWidth) return resolve();
      image.onload = resolve;
      image.onerror = () => reject(new Error('Falha ao carregar sprite do navio'));
    });
  }
  // World-unit dimensions of the exact sprite frame on screen.
  // A 400x400 muzzle map stays aligned when viewport size, DPR or zoom changes.
  getFrameWorldSize(zoom = 1) {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(bounds.width * dpr));
    const h = Math.max(1, Math.round(bounds.height * dpr));
    const { columns, rows, frameWidth: configuredWidth, frameHeight: configuredHeight } = this.definition.sprite;
    const frameWidth = (this.image.naturalWidth / columns) || configuredWidth;
    const frameHeight = (this.image.naturalHeight / rows) || configuredHeight;
    const targetSize = playerShipPixelSize(w, h, dpr, zoom, this.definition);
    const factor = targetSize / Math.max(frameWidth, frameHeight) / (Math.max(.001, zoom) * dpr);
    return { width: frameWidth * factor, height: frameHeight * factor };
  }
  render(headingDegrees, shipPosition, cameraView, zoom = 1, impact = null, regionId = 'r1') {
    const ctx = this.ctx;
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(bounds.width * dpr));
    const h = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);
    const frame = getShipFrame(headingDegrees, this.definition);
    const { columns, rows } = this.definition.sprite;
    // Use actual image dimensions: exported sheets are not necessarily 1600x1600.
    const frameWidth = this.image.naturalWidth / columns;
    const frameHeight = this.image.naturalHeight / rows;
    const targetSize = playerShipPixelSize(w, h, dpr, zoom, this.definition);
    const scale = targetSize / Math.max(frameWidth, frameHeight);
    const drawW = frameWidth * scale;
    const drawH = frameHeight * scale;
    const centerX = w / 2 + (shipPosition.x - cameraView.x) * zoom * dpr;
    const centerY = h / 2 + (shipPosition.y - cameraView.y) * zoom * dpr;
    // Temporary roll/pitch from a Kraken hit; sprite heading and cannon pivots stay unchanged.
    const strength = Math.max(0, Math.min(1, Number(impact?.strength) || 0));
    const phase = Number(impact?.phase) || 0;
    ctx.save();
    ctx.translate(centerX, centerY);
    if (strength > 0) {
      ctx.translate(Math.sin(phase * 2.6) * 3 * strength * dpr,
        -Math.sin(phase * 3.2) * 6 * strength * dpr);
      ctx.rotate(Math.sin(phase * 2.2) * .065 * strength);
      ctx.scale(1 + Math.sin(phase * 4.1) * .026 * strength,
        1 - Math.sin(phase * 4.1) * .026 * strength);
    }
    // Lightweight 2.5D depth cues: water contact shadow and reflected hull glow.
    // Purely visual, with no changes to ship position, scale or cannon mapping.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches !== true) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#061626';
      ctx.filter = 'blur(' + Math.max(2, 5 * dpr) + 'px)';
      ctx.beginPath();
      ctx.ellipse(3 * dpr, drawH * .18, drawW * .24, drawH * .105, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Waterline shimmer and contact foam sit behind the ship sprite.
    // They share the ship's visual transform but never affect gameplay geometry.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    ctx.save();
    const waterY = drawH * .19;
    const reflection = ctx.createLinearGradient(0, waterY, 0, waterY + drawH * .24);
    reflection.addColorStop(0, 'rgba(185, 231, 245, 0.17)');
    reflection.addColorStop(1, 'rgba(185, 231, 245, 0)');
    ctx.fillStyle = reflection;
    ctx.beginPath();
    ctx.ellipse(0, waterY + drawH * .085, drawW * .22, drawH * .16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(215, 245, 252, 0.32)';
    ctx.lineWidth = Math.max(1, dpr * 1.25);
    ctx.beginPath();
    ctx.ellipse(0, waterY, drawW * .235, drawH * .082, 0, .12 * Math.PI, .87 * Math.PI);
    ctx.stroke();
    if (!reducedMotion) {
      ctx.strokeStyle = 'rgba(235, 250, 255, 0.19)';
      ctx.lineWidth = Math.max(0.75, dpr);
      ctx.beginPath();
      ctx.ellipse(0, waterY + drawH * .02, drawW * .275, drawH * .108, 0, .15 * Math.PI, .80 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.shadowColor = 'rgba(4, 18, 28, 0.55)';
    ctx.shadowBlur = 9 * dpr;
    ctx.shadowOffsetX = 2 * dpr;
    ctx.shadowOffsetY = 5 * dpr;
    ctx.drawImage(this.image, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight,
      frameWidth, frameHeight, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    // Region-specific ambient light is drawn only over visible ship pixels.
    // Source-atop keeps the ocean and the transparent sprite margins untouched.
    const ambient = regionId === 'r4'
      ? 'rgba(150, 210, 255, 0.13)'
      : regionId === 'r3'
        ? 'rgba(75, 204, 173, 0.085)'
        : regionId === 'r2'
          ? 'rgba(128, 103, 176, 0.12)'
          : 'rgba(255, 218, 160, 0.055)';
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = ambient;
    ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    ctx.restore();
  }
}
