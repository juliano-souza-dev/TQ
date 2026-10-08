export class TreasureRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
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
    for (const chest of treasures) {
      const x = width / 2 + (chest.x - camera.x) * zoom * dpr;
      const y = height / 2 + (chest.y - camera.y) * zoom * dpr;
      if (x < -60 || x > width + 60 || y < -60 || y > height + 60) continue;
      const scale = Math.max(.8, Math.min(1.6, zoom)) * dpr;
      const pulse = .55 + .45 * Math.sin(timeMs / 450 + chest.x);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.shadowColor = '#ffcd6a';
      ctx.shadowBlur = 15 + pulse * 17;
      ctx.fillStyle = '#50351e';
      ctx.strokeStyle = '#e4b862';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-19, -9, 38, 27, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#865126';
      ctx.beginPath();
      ctx.roundRect(-19, -18, 38, 16, [8, 8, 3, 3]);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fce27d';
      ctx.fillRect(-4, -12, 8, 26);
      ctx.fillStyle = '#2c2f23';
      ctx.fillRect(-1.5, -3, 3, 8);
      ctx.restore();
    }
  }
}
