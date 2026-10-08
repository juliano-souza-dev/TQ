import { projectilePosition } from '../combat/Projectiles.js';
import { AMMUNITION, getAmmunitionAssetUrl } from '../items/EquipmentCatalog.js';

// Renders *into the existing NPC world canvas*. The ocean, ships and cannonballs
// therefore share one camera projection instead of competing CSS overlays.
export class NavalProjectileRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ammoImage = null;
    this.ammoReady = false;
    const ammo = AMMUNITION.find(item => item.id === 'rusted-iron');
    if (ammo && typeof Image !== 'undefined') {
      const image = new Image();
      image.onload = () => { this.ammoReady = image.naturalWidth > 0; };
      image.onerror = () => { this.ammoReady = false; };
      image.src = getAmmunitionAssetUrl(ammo);
      this.ammoImage = image;
    }
  }

  render(projectiles, effects, camera, zoom = 1) {
    if (!projectiles.length && !effects.length) return;
    const canvas = this.canvas;
    const ctx = this.ctx;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width, h = canvas.height;
    if (w < 1 || h < 1 || !rect.width || !rect.height) return;
    const scale = zoom * dpr;
    const project = (x, y, elevation = 0) => ({
      x: w / 2 + (x - camera.x) * scale,
      y: h / 2 + (y - camera.y - elevation) * scale,
    });

    for (const shot of projectiles) {
      const t = Math.min(1, shot.elapsed / shot.duration);
      const pos = projectilePosition(shot, t);
      const head = project(pos.x, pos.y, pos.height);
      const tailStart = Math.max(0, t - 0.22);
      const radius = 12 * dpr * Math.max(0.75, Math.min(1.4, zoom));

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Smoke follows earlier points of the exact same ballistic curve.
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        for (let pointIndex = 0; pointIndex <= 14; pointIndex++) {
          const time = tailStart + (t - tailStart) * pointIndex / 14;
          const trail = projectilePosition(shot, time);
          const screen = project(trail.x, trail.y, trail.height);
          if (pointIndex === 0) ctx.moveTo(screen.x, screen.y);
          else ctx.lineTo(screen.x, screen.y);
        }
        ctx.globalAlpha = layer === 0 ? 0.72 : 0.86;
        ctx.strokeStyle = layer === 0 ? '#263544' : '#fff3d5';
        ctx.lineWidth = (layer === 0 ? 10 : 3.5) * dpr;
        ctx.shadowColor = '#ffbd67';
        ctx.shadowBlur = layer === 0 ? 6 * dpr : 10 * dpr;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Silhouette and lit rim are visible against both bright and dark water.
      ctx.shadowColor = '#ffbe69';
      ctx.shadowBlur = 12 * dpr;
      ctx.fillStyle = '#171c22';
      ctx.strokeStyle = '#fff1c6';
      ctx.lineWidth = 2.5 * dpr;
      ctx.beginPath();
      ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (this.ammoReady) {
        const size = radius * 2.5;
        ctx.drawImage(this.ammoImage, head.x - size / 2, head.y - size / 2, size, size);
      }
      ctx.restore();
    }

    for (const effect of effects) {
      const elapsed = Math.max(0, Math.min(1, effect.elapsed / effect.duration));
      const alpha = (1 - elapsed) ** 1.5;
      const p = project(effect.x, effect.y);
      const radius = (effect.kind === 'muzzle' ? 22 : 15) * dpr + 29 * dpr * elapsed;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (effect.kind === 'splash') {
        ctx.strokeStyle = '#e3fbff';
        ctx.shadowColor = '#a0e9ff';
        ctx.shadowBlur = 12 * dpr;
        ctx.lineWidth = 4 * dpr;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, radius, radius * 0.48, 0, 0, 2 * Math.PI);
        ctx.stroke();
        for (let n = 0; n < 6; n++) {
          const angle = n * Math.PI / 3;
          const reach = (12 + 25 * elapsed) * dpr;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(angle) * reach,
            p.y + Math.sin(angle) * reach * .55 - Math.sin(Math.PI * elapsed) * 12 * dpr,
            2.7 * dpr, 0, 2 * Math.PI);
          ctx.fillStyle = '#effcff';
          ctx.fill();
        }
      } else {
        ctx.fillStyle = effect.kind === 'hit' ? '#ff8533' : '#ffe3aa';
        ctx.shadowColor = '#ff951e';
        ctx.shadowBlur = 24 * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fff8d2';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * .4, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
