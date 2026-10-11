import { FROZEN_LANDS_GALLEON_SHIP } from '../ships/FrozenLandsGalleonShip.js';
import { createRedSailCorsair, updateCorsair, RED_SAIL_CORSAIR } from './RedSailCorsair.js';
import { createRoseGoldCorsair as createTerrorDaTabuada, ROSE_GOLD_CORSAIR as TERROR_DA_TABUADA } from './RoseGoldCorsair.js';
import { resolveIslandMovement, collidesWithIsland } from '../world/IslandCollision.js';
import { createBloodRedMarketMerchant } from './BloodRedCorsairNpc.js';
import { createDarkWatersFleet, updateDarkWatersFleet } from './DarkWatersFleet.js';


// Separate overlapping NPC hulls after navigation, without moving them through islands.
// The correction is capped per frame to avoid abrupt jumps.
function resolveNpcCollisions(world) {
  const ships = [...world.entities.values()].filter(n =>
    n.type === 'npc' && n.health > 0 && Number.isFinite(n.x) && Number.isFinite(n.y));
  const radius = n => Math.max(24, Math.min(62, Number(n.collisionRadius) || 38));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < ships.length; i++) for (let j = i + 1; j < ships.length; j++) {
      const a = ships[i], b = ships[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minimum = radius(a) + radius(b);
      if (distance >= minimum) continue;
      const angle = distance > 0.001 ? {x: dx / distance, y: dy / distance} : {x: 1, y: 0};
      const step = Math.min(8, (minimum - distance) / 2);
      const valid = (ship, x, y) =>
        x >= MARGIN && y >= MARGIN &&
        x <= world.region.width - MARGIN && y <= world.region.height - MARGIN &&
        !collidesWithIsland(world.region, x, y, radius(ship));
      const ax = a.x - angle.x * step, ay = a.y - angle.y * step;
      const bx = b.x + angle.x * step, by = b.y + angle.y * step;
      const canA = valid(a, ax, ay), canB = valid(b, bx, by);
      if (canA) { a.x = ax; a.y = ay; }
      if (canB) { b.x = bx; b.y = by; }
    }
  }
}

export const CORSAIR_POPULATION = 20;
export const CORSAIR_RESPAWN_MS = 20000;
const MARGIN = 90;

function spawnPosition(region, player, random) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const x = MARGIN + random() * (region.width - 2 * MARGIN);
    const y = MARGIN + random() * (region.height - 2 * MARGIN);
    if (!collidesWithIsland(region, x, y, 75) && Math.hypot(x - player.x, y - player.y) > 350) {
      return { x, y };
    }
  }
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

  if (world.region.id === 'r4') {
    // Vigias da Geada: neutral until hit, then the same shipId fleet responds.
    for (let i = 0; i < 12; i++) {
      const id = 'r4-vigias-da-geada-' + String(i+1).padStart(2,'0');
      const point = spawnPosition(world.region, world.camera, random);
      world.entities.set(id, {
        id, type:'npc', archetype:'vigia-da-geada', name:'Vigia da Geada',
        shipId:FROZEN_LANDS_GALLEON_SHIP.id, fleetId:FROZEN_LANDS_GALLEON_SHIP.id,
        x:point.x,y:point.y,heading:random()*360,
        health:18000,maxHealth:18000,state:'patrolling',aggression:'neutral',
        damage:12,range:520,cannonSlots:9,speed:250,
        retaliationActive:false,respawnRemainingMs:null,wanderTimeMs:1800,
      });
    }
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
  if (world.region.id === 'r3') {
    const raids = updateDarkWatersFleet(world, deltaMs, random);
    resolveNpcCollisions(world);
    return raids;
  }

  if (world.region.id === 'r4') {
    const fleet = [...world.entities.values()].filter(n=>n.archetype==='vigia-da-geada');
    const alerted = fleet.some(n=>n.health>0 && (n.retaliationActive || n.aggression==='attack'));
    for (const npc of fleet) {
      if (npc.health<=0) {
        npc.respawnRemainingMs=(npc.respawnRemainingMs??CORSAIR_RESPAWN_MS)-deltaMs;
        if(npc.respawnRemainingMs<=0){
          const point=spawnPosition(world.region,world.camera,random);
          Object.assign(npc,{x:point.x,y:point.y,health:npc.maxHealth,
            aggression:'neutral',retaliationActive:false,state:'patrolling',
            respawnRemainingMs:null,lootGranted:false});
        }
        continue;
      }
      // Alert propagates only among ships of this exact shipId.
      if(alerted && Math.hypot(npc.x-world.camera.x,npc.y-world.camera.y)<850){
        npc.retaliationActive=true;npc.aggression='attack';npc.state='retaliating';
      }
      const dt=Math.min(64,Math.max(0,deltaMs))/1000;
      npc.wanderTimeMs-=deltaMs;
      if(npc.retaliationActive){
        npc.heading=(Math.atan2(world.camera.x-npc.x,-(world.camera.y-npc.y))*180/Math.PI+360)%360;
      }else if(npc.wanderTimeMs<=0){
        npc.heading=random()*360;npc.wanderTimeMs=1600+random()*3200;
      }
      const distance=Math.hypot(world.camera.x-npc.x,world.camera.y-npc.y);
      const move=npc.retaliationActive?Math.min(npc.speed*dt,Math.max(0,distance-220)):npc.speed*dt*.45;
      const rad=npc.heading*Math.PI/180;
      const moved=resolveIslandMovement(world.region,npc.x,npc.y,
        Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(rad)*move)),
        Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(rad)*move)),38);
      npc.x=moved.x;npc.y=moved.y;
    }
    resolveNpcCollisions(world);
    return [];
  }
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
          lootGranted:false,
        });
      }
      continue;
    }

    npc.respawnRemainingMs = null;
    if (npc.monsterAssisting) continue;

    if(npc.retaliationActive){
      const dx=world.camera.x-npc.x,dy=world.camera.y-npc.y;
      npc.heading=(Math.atan2(dx,-dy)*180/Math.PI+360)%360;
      npc.state='retaliating';
    }else updateCorsair(npc, deltaMs, targets, onFire);
    npc.wanderTimeMs = (npc.wanderTimeMs ?? 0) - deltaMs;
    if (npc.wanderTimeMs <= 0 && !npc.retaliationActive) {
      npc.heading = random() * 360;
      npc.wanderTimeMs = 1400 + random() * 3400;
    }

    const radians = npc.heading * Math.PI / 180;
    const speed = npc.archetype === TERROR_DA_TABUADA.id
      ? TERROR_DA_TABUADA.speed.initial
      : RED_SAIL_CORSAIR.speed.initial;
    const distance = npc.retaliationActive
      ? Math.min(speed*deltaMs/1000,Math.max(0,Math.hypot(world.camera.x-npc.x,world.camera.y-npc.y)-100))
      : speed * deltaMs / 1000;
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
  resolveNpcCollisions(world);
  return [];
}
