import { createViewProjection } from '../rendering/OrbitalCameraProjection.js';
// NPC selection uses the same world-space transform as click navigation.
export function findNpcAtPoint(entities, x, y, hitRadius = 80) {
  let closest = null;
  let best = hitRadius * hitRadius;
  for (const npc of entities.values()) {
    if ((npc.type !== 'npc' && npc.type !== 'monster') || npc.health <= 0) continue;
    const distance = (npc.x - x) ** 2 + (npc.y - y) ** 2;
    if (distance <= best) { closest = npc; best = distance; }
  }
  return closest;
}

// Sprite-aware picking in orbital view. A billboard extends above its world
// contact point, so inverse ground picking alone can miss visible mast/sails.
export function findNpcAtProjectedScreen(entities, screen, camera, zoom, viewport, orbit) {
  if (!orbit?.enabled || !screen || !viewport?.width || !viewport?.height) return null;
  const view = createViewProjection(camera, zoom, viewport.width, viewport.height, 1, orbit);
  let best = null, score = Infinity;
  for (const npc of entities.values()) {
    if ((npc.type !== 'npc' && npc.type !== 'monster') || npc.health <= 0 || npc.phasedOut) continue;
    const position = view.project(npc);
    if (!position) continue;
    const base = Math.min(viewport.width * .3, viewport.height * .3,
      npc.type === 'monster' ? 185 : 125) * Math.max(.1, zoom);
    const multiplier = npc.type === 'monster' ? 1.75 : 1;
    const spriteSize = base * multiplier * position.relativeScale;
    const radiusX = Math.max(12, spriteSize * .48);
    const radiusY = Math.max(12, spriteSize * .62);
    const dx = (screen.x - position.x) / radiusX;
    const dy = (screen.y - position.y) / radiusY;
    const distance = dx * dx + dy * dy;
    if (distance <= 1 && distance < score) {best = npc;score = distance;}
  }
  return best;
}
