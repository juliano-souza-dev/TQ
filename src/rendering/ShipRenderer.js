import { getShipFrame, getShipSpriteUrl, STARTER_SHIP } from '../ships/ShipRegistry.js';

function getVisualScale(definition) {
  if (definition.id === STARTER_SHIP.id) return 0.95625;
  if (definition.id === 'galeao-rosas-de-ouro') return 0.82;
  if (definition.id === 'galeao-halloween-tabuada') return 0.9;
  if (definition.id === 'fragata-sombra-cacadora') return 0.7;
  return 1;
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
    const targetSize = Math.min(w * .40, h * .40, 240 * dpr)
      * getVisualScale(this.definition) * zoom;
    const factor = targetSize / Math.max(frameWidth, frameHeight) / (Math.max(.001, zoom) * dpr);
    return { width: frameWidth * factor, height: frameHeight * factor };
  }
  render(headingDegrees, shipPosition, cameraView, zoom = 1, impact = null) {
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
    const targetSize = Math.min(w * 0.40, h * 0.40, 240 * dpr) * getVisualScale(this.definition) * zoom;
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
    ctx.drawImage(this.image, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight,
      frameWidth, frameHeight, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }
}
