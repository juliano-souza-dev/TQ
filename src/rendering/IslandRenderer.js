// Shared island renderer. Island definitions belong to the region, not this renderer.
export class IslandRenderer {
  constructor(canvas, islands = []) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.islands = islands;
    this.images = new Map();
  }
  async init() {
    const byAsset = new Map();
    const loadAsset = asset => {
      if (byAsset.has(asset)) return byAsset.get(asset);
      const pending = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Falha ao carregar asset de ilha: ' + asset));
        image.src = asset;
      });
      byAsset.set(asset, pending);
      return pending;
    };
    await Promise.all(this.islands.map(async island => {
      try {
        const image = await loadAsset(island.asset);
        this.images.set(island.id, image);
      } catch (error) {
        // Decorative scenery must never prevent the ocean from starting.
        // Ports remain required because they are gameplay destinations.
        if (island.kind === 'decoration') {
          console.warn('[TabuadaQuest] Ilha decorativa ignorada:', island.id, error);
          return;
        }
        throw new Error('Falha ao carregar ilha: ' + island.id, { cause: error });
      }
    }));
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
      // Preserve the original image proportions; collision footprint is independent.
      const height = size * image.naturalHeight / image.naturalWidth;
      const x = w / 2 + (island.x - cameraView.x) * zoom * dpr;
      const y = h / 2 + (island.y - cameraView.y) * zoom * dpr;
      this.ctx.drawImage(image, x - size / 2, y - height / 2, size, height);
    }
  }
}
