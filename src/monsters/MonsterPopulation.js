import { collidesWithIsland } from '../world/IslandCollision.js';

export const MONSTERS_PER_MAP = 2;
export const MONSTER_RESPAWN_MS = 60000;
export const MONSTER_GOLD_MIN = 20;
export const MONSTER_GOLD_MAX = 80;

export function createMonsterPopulation(world, random = Math.random) {
  const region = world.region;
  for (let i = 0; i < MONSTERS_PER_MAP; i++) {
    let x = region.width / 2, y = region.height / 2;
    for (let attempt = 0; attempt < 150; attempt++) {
      const candidateX = 130 + random() * Math.max(1, region.width - 260);
      const candidateY = 130 + random() * Math.max(1, region.height - 260);
      if (collidesWithIsland(region, candidateX, candidateY, 85)) continue;
      if (Math.hypot(candidateX - world.camera.x, candidateY - world.camera.y) < 300) continue;
      if ([...world.entities.values()].some(other => other.type === 'monster' && Math.hypot(candidateX-other.x,candidateY-other.y)<170)) continue;
      x = candidateX; y = candidateY; break;
    }
    const id = region.id + '-kraken-' + String(i + 1).padStart(2, '0');
    world.entities.set(id, {
      id, name: 'Kraken das Profundezas', type: 'monster', archetype: 'sea-monster-kraken',
      x, y, heading: 0, health: 1650, maxHealth: 1650,
      state: 'idle', respawnRemainingMs: null, animationTimeMs: random() * 2000,
    });
  }
}

export function updateMonsterPopulation(world, stepMs) {
  for (const monster of world.entities.values()) {
    if (monster.type !== 'monster') continue;
    monster.animationTimeMs = (monster.animationTimeMs + stepMs) % 600000;
    if (monster.health > 0) { monster.respawnRemainingMs = null; continue; }
    if (monster.respawnRemainingMs === null) monster.respawnRemainingMs = MONSTER_RESPAWN_MS;
    else monster.respawnRemainingMs -= Math.max(0, stepMs);
    if (monster.respawnRemainingMs !== null && monster.respawnRemainingMs <= 0) {
      monster.health = monster.maxHealth;
      monster.state = 'idle';
      monster.blood = null;
      monster.respawnRemainingMs = null;
    }
  }
}

export function monsterGoldReward(random = Math.random) {
  return MONSTER_GOLD_MIN + Math.floor(Math.min(0.999999, Math.max(0, random())) * (MONSTER_GOLD_MAX - MONSTER_GOLD_MIN + 1));
}
