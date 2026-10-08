import { STARTER_SHIP, getShipFrame, getShipSpriteUrl } from '../ships/ShipRegistry.js';
export class NpcRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.image = new Image();
  }
  async init() {
    this.image.src = getShipSpriteUrl(STARTER_SHIP);
    await new Promise((resolve, reject) => {
      if (this.image.complete && this.image.naturalWidth) return resolve();
      this.image.onload = resolve;
      this.image.onerror = () => reject(new Error('Falha ao carregar sprite dos NPCs'));
    });
  }
  render(entities, camera, zoom = 1) {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(bounds.width * dpr));
    const h = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    const ctx = this.ctx; ctx.clearRect(0, 0, w, h);
    const columns = STARTER_SHIP.sprite.columns;
    const rows = STARTER_SHIP.sprite.rows;
    const frameW = this.image.naturalWidth / columns;
    const frameH = this.image.naturalHeight / rows;
    const size = Math.min(w * 0.32, h * 0.32, 185 * dpr) * zoom;
    for (const npc of entities.values()) {
      if (npc.type !== 'npc' || npc.health <= 0) continue;
      const frame = getShipFrame(npc.heading ?? 0);
      const x = w / 2 + (npc.x - camera.x) * zoom * dpr;
      const y = h / 2 + (npc.y - camera.y) * zoom * dpr;
      if (x < -size || x > w + size || y < -size || y > h + size) continue;
      ctx.drawImage(this.image, (frame % columns) * frameW, Math.floor(frame / columns) * frameH,
        frameW, frameH, x - size / 2, y - size / 2, size, size);
      const barW = size * 0.55;
      ctx.fillStyle = '#152233'; ctx.fillRect(x - barW / 2, y - size * 0.52, barW, 5 * dpr);
      ctx.fillStyle = '#e45e52'; ctx.fillRect(x - barW / 2, y - size * 0.52, barW * npc.health / npc.maxHealth, 5 * dpr);
    }
  }
}
