const TREASURE_WRECK_ASSET = new URL('../../assets/treasures/destrocos-piratas-tesouro.webp', import.meta.url).href;

export class TreasureRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.image = new Image();
    this.image.decoding = 'async';
    this.image.src = TREASURE_WRECK_ASSET;
  }

  render(treasures, camera, zoom, timeMs) {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    const loaded = this.image.complete && this.image.naturalWidth > 0;

    for (const wreck of treasures) {
      const x = width / 2 + (wreck.x - camera.x) * zoom * dpr;
      const y = height / 2 + (wreck.y - camera.y) * zoom * dpr;

      const visualZoom = Math.max(.46, Math.min(1.15, Number(zoom) || 1));
      const baseSize = 76;
      const size = baseSize * visualZoom * dpr;
      if (x < -size || x > width + size || y < -size || y > height + size) continue;

      const bob = Math.sin(timeMs / 700 + wreck.x * .01 + wreck.y * .01) * 1.8 * visualZoom * dpr;
      const sway = Math.sin(timeMs / 1250 + wreck.y * .008) * .018;

      ctx.save();
      ctx.translate(x, y + bob);
      ctx.rotate(sway);

      if (loaded) {
        const aspect = this.image.naturalWidth / this.image.naturalHeight || 1;
        const drawH = size;
        const drawW = drawH * aspect;
        ctx.drawImage(this.image, -drawW / 2, -drawH * .56, drawW, drawH);
      }

      ctx.restore();
    }
  }
}
