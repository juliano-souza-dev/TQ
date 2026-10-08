// NPC selection uses the same world-space transform as click navigation.
export function findNpcAtPoint(entities, x, y, hitRadius = 80) {
  let closest = null;
  let best = hitRadius * hitRadius;
  for (const npc of entities.values()) {
    if (npc.type !== 'npc' || npc.health <= 0) continue;
    const distance = (npc.x - x) ** 2 + (npc.y - y) ** 2;
    if (distance <= best) { closest = npc; best = distance; }
  }
  return closest;
}
