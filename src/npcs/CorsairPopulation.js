import { NORTHERN_THIEF_SHIP } from '../ships/NorthernThiefShip.js';
import { FROZEN_LANDS_GALLEON_SHIP } from '../ships/FrozenLandsGalleonShip.js';
import { createRedSailCorsair, updateCorsair, RED_SAIL_CORSAIR } from './RedSailCorsair.js';
import { createRoseGoldCorsair as createTerrorDaTabuada, ROSE_GOLD_CORSAIR as TERROR_DA_TABUADA } from './RoseGoldCorsair.js';
import { resolveIslandMovement, collidesWithIsland } from '../world/IslandCollision.js';
import { createBloodRedMarketMerchant } from './BloodRedCorsairNpc.js';
import { createDarkWatersFleet, updateDarkWatersFleet, createFrozenLandsFugitive, updateFrozenLandsFugitive } from './DarkWatersFleet.js';


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
    for (let i = 0; i < 4; i++) {
      const id = 'r4-vigias-da-geada-' + String(i+1).padStart(2,'0');
      const point = spawnPosition(world.region, world.camera, random);
      world.entities.set(id, {
        id, type:'npc', archetype:'vigia-da-geada', name:'Vigia da Geada',
        shipId:FROZEN_LANDS_GALLEON_SHIP.id, fleetId:FROZEN_LANDS_GALLEON_SHIP.id,
        x:point.x,y:point.y,heading:random()*360,
        health:18000,maxHealth:18000,state:'patrolling',aggression:'neutral',
        damage:12,range:840,cannonSlots:9,specialCannonCount:1,specialCannonAmmoId:'frozen-explosion',speed:187.5,
        retaliationActive:false,respawnRemainingMs:null,wanderTimeMs:1800,sinkSerial:0,
      });
    }
    createFrozenLandsFugitive(world);
    // Nine independent raiders join the R3 fugitive. Never linked to the R4 boss.
    for (let i = 0; i < 9; i++) {
      const id = 'r4-ladrao-gelido-' + String(i + 1).padStart(2, '0');
      if (world.entities.has(id)) continue;
      const leader = [...world.entities.values()].find(n=>n.archetype==='r4-ladrao-gelido');
      const candidate = leader ? {x:leader.x+((i%3)-1)*36,y:leader.y+(Math.floor(i/3)-1)*36} : null;
      const point = candidate && !collidesWithIsland(world.region,candidate.x,candidate.y,38)
        ? candidate : spawnPosition(world.region, world.camera, random);
      world.entities.set(id, {
        id, type:'npc', archetype:'r4-ladrao-gelido', fleetId:'r4-frota-ladrao-gelido',
        name:'Ladrão do Norte', shipId:NORTHERN_THIEF_SHIP.id,
        x:point.x, y:point.y, heading:random()*360,
        health:24000, maxHealth:24000, speed:290,
        state:'patrolling', aggression:'flee', retaliationActive:false,
        cannonSlots:4, cannonLayout:NORTHERN_THIEF_SHIP.cannonLayout, damage:5, range:840, cannonReloadMs:10000,
        specialCannonAmmoId:'frozen-explosion', homing:true,
        freezeOnHit:true, freezeDurationMs:5000,
        wanderTimeMs:1200, respawnRemainingMs:null,
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

export function updateCorsairPopulation(world, deltaMs, random = Math.random, onFire = () => {}, playerAlive=true) {
  if (world.region.id === 'r3') {
    const raids = updateDarkWatersFleet(world, deltaMs, random, playerAlive);
    // R3: maintain a 100-unit hull clearance from the actual player ship.
    // Check the final positions after NPC-to-NPC collision resolution.
    resolveNpcCollisions(world);
    const player=world.camera;
    for(const npc of world.entities.values()){
      if(npc.type!=='npc'||npc.health<=0||npc.phasedOut)continue;
      const dx=npc.x-player.x,dy=npc.y-player.y;
      const gap=Math.hypot(dx,dy);
      if(gap>=100)continue;
      const angle=gap>0.001?Math.atan2(dy,dx):((npc.heading??0)-90)*Math.PI/180;
      const ux=Math.cos(angle),uy=Math.sin(angle);
      // Project to the safe circle; use collision-aware movement, no island clipping.
      const targetX=Math.max(MARGIN,Math.min(world.region.width-MARGIN,player.x+ux*100));
      const targetY=Math.max(MARGIN,Math.min(world.region.height-MARGIN,player.y+uy*100));
      const moved=resolveIslandMovement(world.region,npc.x,npc.y,targetX,targetY,38);
      if(Math.hypot(moved.x-player.x,moved.y-player.y)>gap){
        npc.x=moved.x;npc.y=moved.y;
      }
    }
    return raids;
  }

  if (world.region.id === 'r4') {
    const fleet = [...world.entities.values()].filter(n=>n.archetype==='vigia-da-geada');
    const alerted = fleet.some(n=>n.health>0 && (n.retaliationActive || n.aggression==='attack'));
    for (const npc of fleet) {
      if (npc.health<=0) {
        npc.respawnRemainingMs=(npc.respawnRemainingMs??120000)-deltaMs;
        if(npc.respawnRemainingMs<=0){
          const point=spawnPosition(world.region,world.camera,random);
          Object.assign(npc,{x:point.x,y:point.y,health:npc.maxHealth,
            aggression:'neutral',retaliationActive:false,state:'patrolling',
            respawnRemainingMs:null,lootGranted:false,sinkSerial:(npc.sinkSerial??0)+1});
        }
        continue;
      }
      // Alert propagates only among ships of this exact shipId.
      if(alerted && Math.hypot(npc.x-world.camera.x,npc.y-world.camera.y)<850){
        npc.retaliationActive=true;npc.aggression='attack';npc.state='retaliating';
      }
      if(Date.now()<(npc.frozenUntil||0)){npc.state='frozen';continue;}
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
    // Pack tactics: three or more within 100m stand and fight.
    // Sinking one member breaks the formation and sends survivors fleeing.
    const thieves=[...world.entities.values()].filter(n=>n.archetype==='r4-ladrao-gelido');
    // A sinking breaks only the current engagement, not every future battle.
    const sunk=thieves.some(n=>n.health<=0 && n.retaliationActive);
    if(sunk){
      for(const member of thieves){
        member.retaliationActive=false;
        member.aggression='flee';
        if(member.health>0)member.state='escaping';
      }
    }
    for(const npc of thieves){
      if(npc.health<=0){
        npc.respawnRemainingMs=(npc.respawnRemainingMs??120000)-deltaMs;
        if(npc.respawnRemainingMs<=0){
          const p=spawnPosition(world.region,world.camera,random);
          Object.assign(npc,{x:p.x,y:p.y,health:npc.maxHealth,state:'patrolling',
            retaliationActive:false,aggression:'flee',respawnRemainingMs:null,lootGranted:false});
        }
        continue;
      }
      if(Date.now()<(npc.frozenUntil||0)){npc.state='frozen';continue;}
      const nearby=thieves.filter(other=>other.health>0 &&
        Math.hypot(other.x-npc.x,other.y-npc.y)<=100).length;
      const engaged=!!npc.retaliationActive && npc.health>0;
      const stand=engaged&&!sunk&&nearby>2;
      npc.aggression=stand?'attack':'flee';
      npc.state=engaged?(stand?'retaliating':'escaping'):(npc.state==='escaping'?'escaping':'patrolling');
      const dt=Math.min(64,Math.max(0,deltaMs))/1000;
      const dx=world.camera.x-npc.x,dy=world.camera.y-npc.y;
      const distance=Math.hypot(dx,dy);
      npc.wanderTimeMs=(npc.wanderTimeMs??0)-deltaMs;
      if(engaged){
        const angle=(Math.atan2(stand?dx:-dx,stand?-dy:dy)*180/Math.PI+360)%360;
        npc.heading=angle;
      }else if(npc.wanderTimeMs<=0){
        npc.heading=random()*360;npc.wanderTimeMs=1200+random()*2500;
      }
      const movement=engaged?(stand?Math.min(npc.speed*dt,Math.max(0,distance-220)):npc.speed*dt):npc.speed*dt*.45;
      const rad=npc.heading*Math.PI/180;
      const moved=resolveIslandMovement(world.region,npc.x,npc.y,
        Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(rad)*movement)),
        Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(rad)*movement)),38);
      npc.x=moved.x;npc.y=moved.y;
    }
    const fugitive=world.entities.get('r4-sombra-do-saque');
    if(fugitive && !fugitive.retaliationActive){fugitive.aggression='flee';fugitive.state='escaping';}
    const raids=updateFrozenLandsFugitive(world,deltaMs,random);
    resolveNpcCollisions(world);
    return raids;
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
