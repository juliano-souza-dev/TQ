import { TERROR_DO_MAR_SHIP } from '../ships/TerrorDoMarShip.js';
import { resolveIslandMovement } from '../world/IslandCollision.js';

export const TERROR_DO_MAR_MISSION_ID = 'r2-terror-do-mar';
export const TERROR_DO_MAR_NPC = Object.freeze({
  id: 'terror-do-mar',
  shipId: TERROR_DO_MAR_SHIP.id,
  name: TERROR_DO_MAR_SHIP.name,
  aggression: 'peaceful',
  damage: 0,
  range: 0,
  cannonSlots: 0,
  maxHealth: 500000,
  attackMissionId: TERROR_DO_MAR_MISSION_ID,
});

const SPAWN = Object.freeze({ x: 2140, y: 2700 });
const MARGIN = 120;
const normalize = angle => (angle % 360 + 360) % 360;

export function createTerrorDoMar(id='r2-terror-do-mar') {
  return {
    id,
    type: 'npc',
    archetype: TERROR_DO_MAR_NPC.id,
    name: TERROR_DO_MAR_NPC.name,
    shipId: TERROR_DO_MAR_NPC.shipId,
    aggression: 'peaceful',
    x: SPAWN.x,
    y: SPAWN.y,
    heading: 40,
    health: TERROR_DO_MAR_NPC.maxHealth,
    maxHealth: TERROR_DO_MAR_NPC.maxHealth,
    damage: 0,
    range: 0,
    cannonSlots: 0,
    attackMissionId: TERROR_DO_MAR_MISSION_ID,
    attackMissionName: 'Terror do Mar',
    attackLockedMessage: '🔒 O Terror do Mar só pode ser atacado durante a missão Terror do Mar.',
    assistDisabled: true,
    state: 'cruising',
    speed: TERROR_DO_MAR_SHIP.speed.initial,
    cruiseTimeMs: 2200,
  };
}

export function createTerrorDoMarPopulation(world) {
  if (world.region.id !== 'r2' || world.entities.has('r2-terror-do-mar')) return false;
  world.entities.set('r2-terror-do-mar', createTerrorDoMar());
  return true;
}

export function updateTerrorDoMarPopulation(world, deltaMs, random=Math.random) {
  const npc=world.entities.get('r2-terror-do-mar');
  if (!npc || npc.health <= 0) return;
  const dt=Math.min(64,Math.max(0,deltaMs))/1000;
  npc.cruiseTimeMs=(npc.cruiseTimeMs??0)-deltaMs;
  if (npc.cruiseTimeMs<=0) {
    npc.heading=normalize(npc.heading+(random()-.5)*70);
    npc.cruiseTimeMs=1800+random()*2600;
  }
  const radians=npc.heading*Math.PI/180;
  const speed=TERROR_DO_MAR_SHIP.speed.initial;
  const nextX=Math.max(MARGIN,Math.min(world.region.width-MARGIN,npc.x+Math.sin(radians)*speed*dt));
  const nextY=Math.max(MARGIN,Math.min(world.region.height-MARGIN,npc.y-Math.cos(radians)*speed*dt));
  const moved=resolveIslandMovement(world.region,npc.x,npc.y,nextX,nextY,58);
  if (Math.hypot(moved.x-npc.x,moved.y-npc.y)<speed*dt*.25) {
    npc.heading=normalize(npc.heading+130+random()*100);
    npc.cruiseTimeMs=1300;
  }
  npc.x=moved.x;
  npc.y=moved.y;
  // Ele nunca revida. Mesmo depois de atingido, volta ao estado neutro.
  if (npc.health>0) npc.state='cruising';
}
