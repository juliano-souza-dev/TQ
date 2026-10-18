import { collidesWithIsland } from '../world/IslandCollision.js';
import { PLAYABLE_FROZEN_LANDS } from '../ships/FleetAutoEquipment.js';

export const FROZEN_MIRROR_BOSS_ID='r4-almirante-boreal';
export const FROZEN_MIRROR_BOSS_NAME='Almirante Boreal · O Reflexo Gelado';

// Region 4 final encounter: the exact same ship atlas as the player,
// but an independent opponent. No new graphic asset or animation load.
export function createFrozenMirrorBoss(world){
  if(!world?.fleetNoRespawn||world.region?.id!=='r4')return null;
  const existing=world.entities.get(FROZEN_MIRROR_BOSS_ID);
  if(existing)return existing;
  const {region,camera}=world;
  const px=Number.isFinite(camera?.x)?camera.x:region.spawn.x;
  const py=Number.isFinite(camera?.y)?camera.y:region.spawn.y;
  const safe=(x,y)=>{
    if(x<180||y<180||x>region.width-180||y>region.height-180)return false;
    if(collidesWithIsland(region,x,y,100))return false;
    return ![...world.entities.values()].some(n=>n.health>0
      && Number.isFinite(n.x)&&Number.isFinite(n.y)
      && Math.hypot(n.x-x,n.y-y)<185);
  };
  let point=null;
  for(const radius of [640,780,950,1120]){
    for(let i=0;i<16;i++){
      const angle=i*Math.PI/8;
      const x=px+Math.cos(angle)*radius,y=py+Math.sin(angle)*radius;
      if(safe(x,y)){point={x,y};break;}
    }
    if(point)break;
  }
  if(!point){
    let best=Infinity;
    for(let y=220;y<region.height-190;y+=200){
      for(let x=220;x<region.width-190;x+=200){
        if(!safe(x,y))continue;
        const distance=Math.hypot(x-px,y-py);
        if(distance<300)continue;
        const score=Math.abs(distance-750);
        if(score<best){best=score;point={x,y};}
      }
    }
  }
  if(!point)return null;
  const bearing=(Math.atan2(px-point.x,-(py-point.y))*180/Math.PI+360)%360;
  const boss={
    id:FROZEN_MIRROR_BOSS_ID,name:FROZEN_MIRROR_BOSS_NAME,
    type:'npc',archetype:'frozen-mirror-boss',
    shipId:PLAYABLE_FROZEN_LANDS.id,
    x:point.x,y:point.y,heading:bearing,
    health:120000,maxHealth:120000,
    speed:Math.max(250,Number(PLAYABLE_FROZEN_LANDS.speed?.initial)||250),
    baseSpeed:Math.max(250,Number(PLAYABLE_FROZEN_LANDS.speed?.initial)||250),
    cannonSlots:PLAYABLE_FROZEN_LANDS.cannonSlots,
    cannonLayout:PLAYABLE_FROZEN_LANDS.cannonLayout,
    range:1180,damage:20,freezeDurationMs:3000,
    retaliationActive:true,aggression:'attack',state:'retaliating',
    respawnRemainingMs:null,assistDisabled:true,
  };
  world.entities.set(boss.id,boss);
  return boss;
}
