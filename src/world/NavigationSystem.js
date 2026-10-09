import { resolveIslandMovement } from './IslandCollision.js';
import { integratePlayerVelocity } from './navigation/PlayerKinematics.mjs';
import { targetNavigationVector } from './WorldNavigationInput.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

const PLAYER_COLLISION_RADIUS = 32;
const KRAKEN_COLLISION_RADIUS = 54 * 1.75;

// Resolve movement against living Kraken bodies, keeping sliding along the edge.
// Sweep the segment to stop fast ships from crossing between two frames.
export function resolveKrakenMovement(world, fromX, fromY, toX, toY) {
  const monsters = [...(world?.entities?.values?.() ?? [])]
    .filter(entity => entity.type === 'monster' && entity.health > 0);
  let x = toX, y = toY;
  for (const monster of monsters) {
    const radius = PLAYER_COLLISION_RADIUS + KRAKEN_COLLISION_RADIUS;
    const sx = fromX - monster.x, sy = fromY - monster.y;
    const dx = x - fromX, dy = y - fromY;
    const before = Math.hypot(sx, sy);
    const after = Math.hypot(x - monster.x, y - monster.y);
    // A player already overlapping a Kraken must be able to sail outward.
    if (before < radius && after > before) continue;
    const travelSq = dx * dx + dy * dy;
    const t = travelSq > 0 ? clamp(-(sx * dx + sy * dy) / travelSq, 0, 1) : 0;
    const closest = Math.hypot(sx + dx * t, sy + dy * t);
    if (closest >= radius) continue;
    if (before >= radius) {
      // Stop just outside the circumference at the first segment intersection.
      const b = 2 * (sx * dx + sy * dy);
      const c = sx * sx + sy * sy - radius * radius;
      const discriminant = b * b - 4 * travelSq * c;
      const hitT = travelSq > 0 && discriminant >= 0
        ? clamp((-b - Math.sqrt(discriminant)) / (2 * travelSq) - .002, 0, 1) : 0;
      const contactX = fromX + dx * hitT;
      const contactY = fromY + dy * hitT;
      // Keep the tangential part of movement to slide around the Kraken.
      const nx = (contactX - monster.x) / Math.max(.001, Math.hypot(contactX - monster.x, contactY - monster.y));
      const ny = (contactY - monster.y) / Math.max(.001, Math.hypot(contactX - monster.x, contactY - monster.y));
      const remainingX = dx * (1 - hitT), remainingY = dy * (1 - hitT);
      const inward = Math.min(0, remainingX * nx + remainingY * ny);
      const slideX = contactX + remainingX - inward * nx;
      const slideY = contactY + remainingY - inward * ny;
      const slideDistance = Math.hypot(slideX - monster.x, slideY - monster.y);
      if (slideDistance >= radius) {
        x = slideX; y = slideY;
      } else {
        x = contactX; y = contactY;
      }
    } else {
      x = fromX;
      y = fromY;
    }
  }
  return { x, y };
}


// Cinemática importada do projeto antigo com adaptador para o estado do TQ.
export function advanceNavigation(world, input, deltaMs, speed = 80) {
  if (!world?.region || !world.camera) throw new TypeError('world required');
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('invalid deltaMs');
  const dt=Math.min(deltaMs,100)/1000;
  const x=Number.isFinite(input?.x)?input.x:0;
  const y=Number.isFinite(input?.y)?input.y:0;
  const magnitude=Math.max(1,Math.hypot(x,y));
  const previous=world.navigationVelocity??{vx:0,vy:0};
  const velocity=integratePlayerVelocity({
    ...previous, input:{x:x/magnitude,y:y/magnitude},
    acceleration:Math.max(240,speed*5),
    maxSpeed:Math.max(40,speed),
    minSpeed:0,
    braking:.12,dt
  });
  const fromX=world.camera.x,fromY=world.camera.y;
  const toX=clamp(fromX+velocity.vx*dt,0,world.region.width);
  const toY=clamp(fromY+velocity.vy*dt,0,world.region.height);
  const islandResolved=resolveIslandMovement(world.region,fromX,fromY,toX,toY);
  const resolved=resolveKrakenMovement(world,fromX,fromY,islandResolved.x,islandResolved.y);
  world.camera.x=resolved.x;
  world.camera.y=resolved.y;
  world.navigationVelocity={
    vx:Math.abs(resolved.x-toX)>.01?0:velocity.vx,
    vy:Math.abs(resolved.y-toY)>.01?0:velocity.vy
  };
}

export function advanceTowardDestination(world,destination,deltaMs,speed=80){
  if(!destination)return {arrived:true,heading:null};
  const fromX=world.camera.x,fromY=world.camera.y;
  const vector=targetNavigationVector(world.camera,destination,{arrivalRadius:4,slowRadius:Math.max(70,speed*.65)});
  if(vector.arrived){
    world.navigationVelocity={vx:0,vy:0};
    return {arrived:true,heading:null};
  }
  advanceNavigation(world,vector,deltaMs,speed);
  const movement=Math.hypot(world.camera.x-fromX,world.camera.y-fromY);
  const arrived=Math.hypot(destination.x-world.camera.x,destination.y-world.camera.y)<=4;
  const blocked=movement<.001 && Math.hypot(world.navigationVelocity.vx,world.navigationVelocity.vy)<.2;
  if(arrived)world.navigationVelocity={vx:0,vy:0};
  return {arrived:arrived||blocked,heading:(Math.atan2(vector.x,-vector.y)*180/Math.PI+360)%360};
}
