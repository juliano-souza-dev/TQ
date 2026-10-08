// Shared island renderer. Island definitions belong to the region, not this renderer.
export class IslandRenderer {
  constructor(canvas, islands = []) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.islands = islands;
    this.images = new Map();
  }
  async init() {
    await Promise.all(this.islands.map(island => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { this.images.set(island.id, image); resolve(); };
      image.onerror = () => reject(new Error('Falha ao carregar ilha: ' + island.id));
      image.src = island.asset;
    })));
  }
  render(cameraView, zoom = 1) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.ctx.clearRect(0, 0, w, h);
    for (const island of this.islands) {
      const image = this.images.get(island.id);
      if (!image) continue;
      const size = island.size * zoom * dpr;
      const aspect = image.naturalHeight / image.naturalWidth;
      const x = w / 2 + (island.x - cameraView.x) * zoom * dpr;
      const y = h / 2 + (island.y - cameraView.y) * zoom * dpr;
      this.ctx.drawImage(image, x - size / 2, y - size * aspect / 2, size, size * aspect);
    }
  }
}
