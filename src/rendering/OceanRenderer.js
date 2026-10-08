// Draws the empty ocean only. No gameplay logic or entity ownership.
export class OceanRenderer {
  constructor(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('Canvas required');
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('2D canvas unavailable');
    this.width = 0;
    this.height = 0;
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.width = width;
    this.height = height;
  }

  render(world) {
    this.resize();
    this.context.fillStyle = world.region.oceanColor;
    this.context.fillRect(0, 0, this.width, this.height);
  }
}
