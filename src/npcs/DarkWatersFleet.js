import { createTerrorDoMar, TERROR_DO_MAR_NPC } from './TerrorDoMarNpc.js';
import { BLOOD_RED_CORSAIR_SHIP } from '../ships/BloodRedCorsairShip.js';
import { resolveIslandMovement, collidesWithIsland } from '../world/IslandCollision.js';

export const DARK_WATERS_RAIDER_ARCHETYPE = 'dark-waters-raider';
export const DARK_WATERS_SPECIAL_AMMO_ID = 'terror-rose';
export const DARK_WATERS_SPECIAL_AMMO_REWARD = 100;
export const DARK_WATERS_RAID_GOLD_CAP = 25;
export const DARK_WATERS_RAID_AMMO_CAP = 20;
export const DARK_WATERS_RAIDER_RESPAWN_MS = 30000;

const MARGIN = 95;
const normalize = angle => (angle % 360 + 360) % 360;
const bearing = (dx, dy) => normalize(Math.atan2(dx, -dy) * 180 / Math.PI);
function turnToward(current, desired, maxStep) {
  const delta = ((desired - current + 540) % 360) - 180;
  return normalize(current + Math.max(-maxStep, Math.min(maxStep, delta)));
}
function safePosition(region, point) {
  if (!point || collidesWithIsland(region, point.x, point.y, 72)) return null;
  return {
    x: Math.max(MARGIN, Math.min(region.width - MARGIN, point.x)),
    y: Math.max(MARGIN, Math.min(region.height - MARGIN, point.y)),
  };
}

function createRaider(config, region) {
  const point = safePosition(region, config);
  if (!point) throw new Error('Posição inválida para o ladrão das Águas Escuras: ' + config.id);
  return {
    id: config.id,
    type: 'npc',
    archetype: DARK_WATERS_RAIDER_ARCHETYPE,
    name: config.name,
    shipId: BLOOD_RED_CORSAIR_SHIP.id,
    x: point.x,
    y: point.y,
    heading: normalize(config.heading ?? 90),
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    state: 'raiding',
    aggression: 'flee',
    damage: 0,
    range: 0,
    cannonSlots: 0,
    speed: config.speed,
    baseSpeed: config.speed,
    detectionRange: config.detectionRange ?? 620,
    raidRadius: config.raidRadius ?? 86,
    rewardAmmoId: DARK_WATERS_SPECIAL_AMMO_ID,
    rewardAmmoAmount: DARK_WATERS_SPECIAL_AMMO_REWARD,
    raidCooldownMs: 0,
    stolenThisPass: false,
    respawnRemainingMs: null,
    home: Object.freeze({ x: point.x, y: point.y, heading: normalize(config.heading ?? 90) }),
  };
}

export function createDarkWatersFleet(world) {
  if (world.region.id !== 'r3') return [];

  const created = [];
  const bossConfig = world.region.terrorBoss;
  if (bossConfig && !world.entities.has(bossConfig.id)) {
    const point = safePosition(world.region, bossConfig);
    if (!point) throw new Error('Posição inválida para o Terror do Mar.');
    const boss = createTerrorDoMar({
      id: bossConfig.id,
      x: point.x,
      y: point.y,
      heading: bossConfig.heading,
    });
    boss.name = TERROR_DO_MAR_NPC.displayName;
    boss.captainName = TERROR_DO_MAR_NPC.captainName;
    boss.aggression = 'attack';
    boss.state = 'retaliating';
    boss.cannonSlots = TERROR_DO_MAR_NPC.cannonSlots;
    boss.damage = TERROR_DO_MAR_NPC.damage;
    boss.range = TERROR_DO_MAR_NPC.range;
    boss.anchor = { x: point.x, y: point.y };
    boss.patrolTimeMs = 2600;
    world.entities.set(boss.id, boss);
    created.push(boss);
  }

  for (const config of world.region.terrorRaiders ?? []) {
    if (world.entities.has(config.id)) continue;
    const raider = createRaider(config, world.region);
    world.entities.set(raider.id, raider);
    created.push(raider);
  }
  return created;
}

function respawnRaider(npc, region) {
  const point = safePosition(region, npc.home);
  if (!point) return false;
  npc.x = point.x;
  npc.y = point.y;
  npc.heading = npc.home.heading;
  npc.health = npc.maxHealth;
  npc.state = 'raiding';
  npc.speed = npc.baseSpeed;
  npc.stolenThisPass = false;
  npc.raidCooldownMs = 0;
  npc.respawnRemainingMs = null;
  return true;
}

function updateBoss(npc, world, deltaMs, random) {
  if (npc.health <= 0) return;
  if (npc.monsterAssisting) return;
  const dt = Math.min(64, Math.max(0, deltaMs)) / 1000;
  const player = world.camera;
  const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
  if (distance < 520) {
    npc.state = 'retaliating';
    npc.heading = turnToward(npc.heading, bearing(player.x - npc.x, player.y - npc.y), 70 * dt);
    return;
  }
  npc.state = 'cruising';
  npc.patrolTimeMs = (npc.patrolTimeMs ?? 0) - deltaMs;
  if (npc.patrolTimeMs <= 0) {
    npc.patrolHeading = normalize(npc.heading + (random() - .5) * 80);
    npc.patrolTimeMs = 2200 + random() * 2200;
  }
  const desired = npc.patrolHeading ?? npc.heading;
  npc.heading = turnToward(npc.heading, desired, 38 * dt);
  const radians = npc.heading * Math.PI / 180;
  const movement = Math.max(0, Number(npc.speed) || 0) * dt;
  const nx = Math.max(MARGIN, Math.min(world.region.width - MARGIN, npc.x + Math.sin(radians) * movement));
  const ny = Math.max(MARGIN, Math.min(world.region.height - MARGIN, npc.y - Math.cos(radians) * movement));
  const moved = resolveIslandMovement(world.region, npc.x, npc.y, nx, ny, 42);
  if (Math.hypot(moved.x - npc.x, moved.y - npc.y) < movement * .25) {
    npc.patrolHeading = normalize(npc.heading + 135);
  }
  npc.x = moved.x;
  npc.y = moved.y;
}

function updateRaider(npc, world, deltaMs, random, raids) {
  if (npc.health <= 0) {
    npc.respawnRemainingMs = (npc.respawnRemainingMs ?? DARK_WATERS_RAIDER_RESPAWN_MS) - Math.max(0, deltaMs);
    if (npc.respawnRemainingMs <= 0) respawnRaider(npc, world.region);
    return;
  }

  const dt = Math.min(64, Math.max(0, deltaMs)) / 1000;
  npc.raidCooldownMs = Math.max(0, (npc.raidCooldownMs ?? 0) - deltaMs);
  const player = world.camera;
  const dx = player.x - npc.x;
  const dy = player.y - npc.y;
  const distance = Math.hypot(dx, dy);

  let desiredHeading = npc.heading;
  if (!npc.stolenThisPass && distance <= npc.detectionRange) {
    npc.state = 'raiding';
    desiredHeading = bearing(dx, dy);
  } else if (npc.stolenThisPass) {
    npc.state = 'escaping';
    desiredHeading = bearing(-dx, -dy);
  } else {
    npc.state = 'passing';
    npc.passTimeMs = (npc.passTimeMs ?? 0) - deltaMs;
    if (npc.passTimeMs <= 0) {
      npc.passHeading = normalize(npc.heading + (random() - .5) * 34);
      npc.passTimeMs = 1000 + random() * 1700;
    }
    desiredHeading = npc.passHeading ?? npc.heading;
  }

  npc.heading = turnToward(npc.heading, desiredHeading, 320 * dt);
  const speed = npc.baseSpeed * (npc.state === 'escaping' ? 1.15 : 1);
  const radians = npc.heading * Math.PI / 180;
  const movement = speed * dt;
  const nx = Math.max(MARGIN, Math.min(world.region.width - MARGIN, npc.x + Math.sin(radians) * movement));
  const ny = Math.max(MARGIN, Math.min(world.region.height - MARGIN, npc.y - Math.cos(radians) * movement));
  const moved = resolveIslandMovement(world.region, npc.x, npc.y, nx, ny, 32);
  const actual = Math.hypot(moved.x - npc.x, moved.y - npc.y);
  if (movement > .1 && actual < movement * .3) {
    npc.heading = normalize(npc.heading + (random() < .5 ? -125 : 125));
    npc.passHeading = npc.heading;
  } else {
    npc.x = moved.x;
    npc.y = moved.y;
  }

  if (!npc.stolenThisPass && npc.raidCooldownMs <= 0
      && Math.hypot(player.x - npc.x, player.y - npc.y) <= npc.raidRadius) {
    npc.stolenThisPass = true;
    npc.raidCooldownMs = 18000;
    raids.push(npc);
  }

  const edge = npc.x <= MARGIN + 4 || npc.x >= world.region.width - MARGIN - 4
    || npc.y <= MARGIN + 4 || npc.y >= world.region.height - MARGIN - 4;
  if (edge && npc.stolenThisPass) {
    respawnRaider(npc, world.region);
    npc.heading = normalize(npc.heading + 180);
  }
}

export function updateDarkWatersFleet(world, deltaMs, random = Math.random) {
  if (world.region.id !== 'r3') return [];
  const raids = [];
  for (const npc of world.entities.values()) {
    if (npc.archetype === TERROR_DO_MAR_NPC.id) updateBoss(npc, world, deltaMs, random);
    else if (npc.archetype === DARK_WATERS_RAIDER_ARCHETYPE) {
      updateRaider(npc, world, deltaMs, random, raids);
    }
  }
  return raids;
}
