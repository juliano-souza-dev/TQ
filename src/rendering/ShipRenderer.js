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
  render(headingDegrees) {
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
    const { columns, frameWidth, frameHeight } = this.definition.sprite;
    const scale = Math.min(w / 4, h / 4, 150 * dpr) / frameWidth;
    const drawW = frameWidth * scale;
    const drawH = frameHeight * scale;
    ctx.drawImage(this.image, (frame % columns) * frameWidth, Math.floor(frame / columns) * frameHeight,
      frameWidth, frameHeight, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
  }
}
