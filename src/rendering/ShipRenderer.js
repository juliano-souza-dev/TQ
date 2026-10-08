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
  render(headingDegrees, offset = { x: 0, y: 0 }, zoom = 1) {
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
    const targetSize = Math.min(w * 0.32, h * 0.32, 190 * dpr);
    const scale = targetSize / Math.max(frameWidth, frameHeight);
    const drawW = frameWidth * scale;
    const drawH = frameHeight * scale;
    ctx.drawImage(this.image, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight,
      frameWidth, frameHeight, (w - drawW) / 2 - offset.x * zoom * dpr, (h - drawH) / 2 - offset.y * zoom * dpr, drawW, drawH);
  }
}
