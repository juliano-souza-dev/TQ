import { resolveIslandMovement } from './IslandCollision.js';
import { integratePlayerVelocity } from './navigation/PlayerKinematics.mjs';
import { targetNavigationVector } from './WorldNavigationInput.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

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
  const resolved=resolveIslandMovement(world.region,fromX,fromY,toX,toY);
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
