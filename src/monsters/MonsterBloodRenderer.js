import { monsterBloodLevel } from './MonsterCombat.js';

// Efeito 2D leve: partículas derivadas do relógio, sem criar DOM ou texturas a cada frame.
export function renderMonsterBlood(ctx, monster, x, y, radius, now = 0) {
  const level = monsterBloodLevel(monster, now);
  if (level <= 0 || radius <= 0) return;
  const count = Math.min(26, Math.ceil(level * 9));
  const maxRadius = radius * (0.28 + 0.11 * Math.min(level, 2));
  const elapsed = now / 1000;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < count; i++) {
    const phase = elapsed * (0.7 + (i % 4) * 0.18) + i * 2.399963229728653;
    const distance = maxRadius * (0.2 + 0.8 * ((i * 0.618033 + elapsed * 0.24) % 1));
    const dx = Math.cos(phase) * distance;
    const dy = Math.sin(phase) * distance * 0.4 + radius * 0.15;
    const particleSize = Math.max(1.2, radius * (0.013 + (i % 3) * 0.007) * Math.min(level, 2));
    ctx.globalAlpha = Math.min(0.75, 0.22 + level * 0.17);
    ctx.fillStyle = i % 4 === 0 ? '#ac2229' : '#c74444';
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, particleSize, particleSize * 0.65, phase, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
