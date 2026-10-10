import { createRedSailCorsair, updateCorsair, RED_SAIL_CORSAIR } from './RedSailCorsair.js';
import { createRoseGoldCorsair as createTerrorDaTabuada, ROSE_GOLD_CORSAIR as TERROR_DA_TABUADA } from './RoseGoldCorsair.js';
import { resolveIslandMovement, collidesWithIsland } from '../world/IslandCollision.js';
import { createBloodRedMarketMerchant } from './BloodRedCorsairNpc.js';
import { createDarkWatersFleet, updateDarkWatersFleet } from './DarkWatersFleet.js';

export const CORSAIR_POPULATION = 20;
export const CORSAIR_RESPAWN_MS = 30000;
const MARGIN = 90;

function spawnPosition(region, player, random) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const x = MARGIN + random() * (region.width - 2 * MARGIN);
    const y = MARGIN + random() * (region.height - 2 * MARGIN);
    if (!collidesWithIsland(region, x, y, 75) && Math.hypot(x - player.x, y - player.y) > 350) return { x, y };
  }
  // Deterministic fallback if the region is too crowded.
  return { x: region.width / 2, y: MARGIN };
}

export function createCorsairPopulation(world, random = Math.random) {
  if (world.region.id === 'r3') {
    if (world.region.blackMarketMerchant) {
      const merchant = createBloodRedMarketMerchant(world.region.blackMarketMerchant);
      world.entities.set(merchant.id, merchant);
    }
    createDarkWatersFleet(world);
    return world.entities.size;
  }

  for (let i = 0; i < CORSAIR_POPULATION; i++) {
    const id = 'corsair-r1-' + String(i + 1).padStart(2, '0');
    const position = spawnPosition(world.region, world.camera, random);
    const npc = world.region.id === 'r1' && i === 0
      ? createTerrorDaTabuada(id, position.x, position.y, random() * 360)
      : createRedSailCorsair(id, position.x, position.y, random() * 360);
    npc.wanderTimeMs = 800 + random() * 2400;
    npc.respawnRemainingMs = null;
    world.entities.set(id, npc);
  }
  return world.entities.size;
}
export function updateCorsairPopulation(world, deltaMs, random = Math.random, onFire = () => {}) {
  if (world.region.id === 'r3') return updateDarkWatersFleet(world, deltaMs, random);

  return [];
}) {
  const targets = new Map([['player', world.camera]]);
  for (const npc of world.entities.values()) {
    if (npc.archetype !== RED_SAIL_CORSAIR.id && npc.archetype !== TERROR_DA_TABUADA.id) continue;
    if (npc.health <= 0) {
      if (npc.respawnRemainingMs == null) npc.respawnRemainingMs = CORSAIR_RESPAWN_MS;
      else npc.respawnRemainingMs -= deltaMs;
      if (npc.respawnRemainingMs <= 0) {
        const position = spawnPosition(world.region, world.camera, random);
        const respawn = npc.archetype === TERROR_DA_TABUADA.id ? createTerrorDaTabuada : createRedSailCorsair;
        Object.assign(npc, respawn(npc.id, position.x, position.y, random() * 360), {
          wanderTimeMs: 800 + random() * 2400,
          respawnRemainingMs: null,
        });
      }
      continue;
    }
    npc.respawnRemainingMs = null;
    // NPC convocado segura posição até encerrar a salva de arpões.
    if (npc.monsterAssisting) continue;
    updateCorsair(npc, deltaMs, targets, onFire);
    npc.wanderTimeMs = (npc.wanderTimeMs ?? 0) - deltaMs;
    if (npc.wanderTimeMs <= 0) {
      npc.heading = random() * 360;
      npc.wanderTimeMs = 1400 + random() * 3400;
    }
    const radians = npc.heading * Math.PI / 180;
    const speed = npc.archetype === TERROR_DA_TABUADA.id ? TERROR_DA_TABUADA.speed.initial : RED_SAIL_CORSAIR.speed.initial;
    const distance = speed * deltaMs / 1000;
    const nextX = Math.max(MARGIN, Math.min(world.region.width - MARGIN, npc.x + Math.sin(radians) * distance));
    const nextY = Math.max(MARGIN, Math.min(world.region.height - MARGIN, npc.y - Math.cos(radians) * distance));
    const moved = resolveIslandMovement(world.region, npc.x, npc.y, nextX, nextY, 32);
    if (Math.hypot(moved.x - npc.x, moved.y - npc.y) < distance * 0.25) {
      npc.heading = (npc.heading + 115 + random() * 130) % 360;
      npc.wanderTimeMs = 1200;
    }
    npc.x = moved.x;
    npc.y = moved.y;
  }
}
