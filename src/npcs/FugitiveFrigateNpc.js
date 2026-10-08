import { FUGITIVE_FRIGATE_SHIP } from '../ships/FugitiveFrigateShip.js';
import { resolveIslandMovement, collidesWithIsland } from '../world/IslandCollision.js';

export const FUGITIVE_FRIGATE_NPC = Object.freeze({
  id: 'fugitive-frigate',
  shipId: FUGITIVE_FRIGATE_SHIP.id,
  name: FUGITIVE_FRIGATE_SHIP.name,
  aggression: 'flee',
  detectionRange: FUGITIVE_FRIGATE_SHIP.ai.detectionRange,
  disengageRange: FUGITIVE_FRIGATE_SHIP.ai.disengageRange,
  damage: 0,
  range: 0,
  cannonSlots: 0,
});

const MARGIN = 90;
const normalize = angle => (angle % 360 + 360) % 360;
function turnToward(current, desired, degrees) {
  const delta = ((desired - current + 540) % 360) - 180;
  return normalize(current + Math.max(-degrees, Math.min(degrees, delta)));
}
function bearing(dx, dy) {
  return normalize(Math.atan2(dx, -dy) * 180 / Math.PI);
}
function spawnPosition(region, player, random) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const x = MARGIN + random() * Math.max(0, region.width - 2 * MARGIN);
    const y = MARGIN + random() * Math.max(0, region.height - 2 * MARGIN);
    if (!collidesWithIsland(region, x, y, 75) &&
      Math.hypot(x - player.x, y - player.y) > FUGITIVE_FRIGATE_NPC.detectionRange) {
      return { x, y };
    }
  }
  return null; // Não criar navio dentro de ilha ou sobre o jogador.
}

export function createFugitiveFrigate(id, x, y, heading = 0, random = Math.random) {
  const { min, max } = FUGITIVE_FRIGATE_SHIP.healthRange;
  const maxHealth = min + Math.floor(Math.min(0.999999, Math.max(0, random())) * (max - min + 1));
  return {
    id, name: FUGITIVE_FRIGATE_SHIP.name,
    shipId: FUGITIVE_FRIGATE_SHIP.id,
    archetype: FUGITIVE_FRIGATE_NPC.id,
    type: 'npc', aggression: 'flee',
    x, y, heading: normalize(heading),
    health: maxHealth, maxHealth,
    damage: 0, range: 0, cannonSlots: 0,
    speed: FUGITIVE_FRIGATE_SHIP.speed.initial,
    state: 'cruising',
    cruiseTimeMs: 1200,
    avoidanceTimeMs: 0,
    avoidanceHeading: 0,
    respawnRemainingMs: null,
  };
}

export function updateFugitiveFrigate(npc, player, region, deltaMs, random = Math.random) {
  if (npc.health <= 0) return npc;
  // Limit simulation jumps when the tab resumes from the background.
  const dt = Math.min(64, Math.max(0, deltaMs)) / 1000;
  const dx = npc.x - player.x, dy = npc.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= FUGITIVE_FRIGATE_NPC.detectionRange || npc.state === 'fleeing' &&
      distance < FUGITIVE_FRIGATE_NPC.disengageRange) {
    npc.state = 'fleeing';
  } else {
    npc.state = 'cruising';
  }
  let desiredHeading = npc.heading;
  if (npc.state === 'fleeing') {
    desiredHeading = bearing(dx, dy); // Proa apontada para longe do jogador.
  } else {
    npc.cruiseTimeMs -= deltaMs;
    if (npc.cruiseTimeMs <= 0) {
      desiredHeading = normalize(npc.heading + (random() - .5) * 85);
      npc.cruiseHeading = desiredHeading;
      npc.cruiseTimeMs = 1300 + random() * 1700;
    } else {
      desiredHeading = npc.cruiseHeading ?? npc.heading;
    }
  }
  if (npc.avoidanceTimeMs > 0) {
    npc.avoidanceTimeMs = Math.max(0, npc.avoidanceTimeMs - deltaMs);
    desiredHeading = npc.avoidanceHeading;
  }
  npc.heading = turnToward(npc.heading, desiredHeading, 260 * dt);
  const speedSpec = FUGITIVE_FRIGATE_SHIP.speed;
  const desiredSpeed = npc.state === 'fleeing' ? speedSpec.max : speedSpec.initial;
  const step = FUGITIVE_FRIGATE_SHIP.acceleration * dt;
  npc.speed = Math.max(speedSpec.min, Math.min(speedSpec.max,
    npc.speed + Math.max(-step, Math.min(step, desiredSpeed - npc.speed))));
  const radians = npc.heading * Math.PI / 180;
  const movement = npc.speed * dt;
  const nextX = Math.max(MARGIN, Math.min(region.width - MARGIN, npc.x + Math.sin(radians) * movement));
  const nextY = Math.max(MARGIN, Math.min(region.height - MARGIN, npc.y - Math.cos(radians) * movement));
  const moved = resolveIslandMovement(region, npc.x, npc.y, nextX, nextY, 32);
  const actual = Math.hypot(moved.x - npc.x, moved.y - npc.y);
  if (movement > .1 && actual < movement * .35 && npc.avoidanceTimeMs <= 0) {
    // Persistir a manobra por alguns frames para não travar contra a costa.
    npc.avoidanceHeading = normalize(npc.heading + (random() < .5 ? -110 : 110));
    npc.avoidanceTimeMs = 850;
  }
  npc.x = moved.x;
  npc.y = moved.y;
  return npc;
}

export function createFugitiveFrigatePopulation(world, random = Math.random) {
  const id = 'fugitive-frigate-r1-01';
  if (world.entities.has(id)) return false;
  const point = spawnPosition(world.region, world.camera, random);
  if (!point) return false;
  world.entities.set(id, createFugitiveFrigate(id, point.x, point.y, random() * 360, random));
  return true;
}

export function updateFugitiveFrigatePopulation(world, deltaMs, random = Math.random) {
  for (const npc of world.entities.values()) {
    if (npc.archetype !== FUGITIVE_FRIGATE_NPC.id) continue;
    if (npc.health > 0) {
      npc.respawnRemainingMs = null;
      updateFugitiveFrigate(npc, world.camera, world.region, deltaMs, random);
      continue;
    }
    npc.respawnRemainingMs = (npc.respawnRemainingMs ?? 30000) - Math.max(0, deltaMs);
    if (npc.respawnRemainingMs > 0) continue;
    const point = spawnPosition(world.region, world.camera, random);
    if (!point) { npc.respawnRemainingMs = 5000; continue; }
    Object.assign(npc, createFugitiveFrigate(npc.id, point.x, point.y, random() * 360, random));
  }
}
