import { getShipFrame, getShipSpriteUrl, STARTER_SHIP } from '../ships/ShipRegistry.js';

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
      * (this.definition.id === STARTER_SHIP.id ? 1.25 : 1) * zoom;
    const factor = targetSize / Math.max(frameWidth, frameHeight) / (Math.max(.001, zoom) * dpr);
    return { width: frameWidth * factor, height: frameHeight * factor };
  }
  render(headingDegrees, shipPosition, cameraView, zoom = 1) {
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
    const targetSize = Math.min(w * 0.40, h * 0.40, 240 * dpr) * (this.definition.id === STARTER_SHIP.id ? 1.25 : 1) * zoom;
    const scale = targetSize / Math.max(frameWidth, frameHeight);
    const drawW = frameWidth * scale;
    const drawH = frameHeight * scale;
    ctx.drawImage(this.image, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight,
      frameWidth, frameHeight, (w - drawW) / 2 + (shipPosition.x - cameraView.x) * zoom * dpr,
      (h - drawH) / 2 + (shipPosition.y - cameraView.y) * zoom * dpr, drawW, drawH);
  }
}
