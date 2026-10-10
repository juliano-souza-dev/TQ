import { collidesWithIsland } from '../world/IslandCollision.js';

export const MONSTERS_PER_MAP = 2;
export const MONSTER_RESPAWN_MS = 60000;
export const MONSTER_GOLD_MIN = 20;
export const MONSTER_GOLD_MAX = 80;

export function createMonsterPopulation(world, random = Math.random) {
  // Águas Escuras começa como uma região naval: por enquanto a população é
  // composta apenas pela Frota do Terror e pelo mercador já registrados.
  if (world.region.id === 'r3') {
    const zone=world.region.ocean?.corruption?.zones?.[0] ?? {x:3220,y:3450};
    const x=zone.x+300,y=zone.y+500;
    if (!collidesWithIsland(world.region,x,y,110)) {
      world.entities.set('r3-leviathan', {
        id:'r3-leviathan',name:'Leviatã das Águas Escuras',
        type:'monster',archetype:'sea-monster-leviathan',
        x,y,heading:0,health:25000,maxHealth:25000,
        attackDamage:50000,state:'retaliating',ambushPhase:'surface',ambushSurfaceMs:1500,
        respawnRemainingMs:null,animationTimeMs:0,
      });
      return 1;
    }
    return 0;
  }
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
  return MONSTERS_PER_MAP;
}

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const angleDelta=(a,b)=>((b-a+540)%360)-180;
function updateLeviathanAmbush(monster,world,stepMs){
  const dt=Math.max(0,stepMs);
  const player=world.camera;
  const distance=Math.hypot(player.x-monster.x,player.y-monster.y);
  const aligned=Math.abs(player.y-monster.y)<100 && distance<800;
  const ready=monster.ambushPhase==='surface'||!monster.ambushPhase;
  if(!monster.ambushPhase)monster.ambushPhase='surface';
  if(ready){
    const target=(Math.atan2(player.x-monster.x,-(player.y-monster.y))*180/Math.PI+360)%360;
    const angle=Number(monster.heading)||0;
    const turn=Math.min(Math.abs(angleDelta(angle,target)),dt*.035);
    monster.heading=(angle+Math.sign(angleDelta(angle,target))*turn+360)%360;
    if(aligned){
      monster.ambushMisalignedMs=0;
      monster.ambushSurfaceMs=(monster.ambushSurfaceMs||0)+dt;
    }else{
      monster.ambushMisalignedMs=(monster.ambushMisalignedMs||0)+dt;
      if(monster.ambushMisalignedMs>=1250 && (monster.ambushSurfaceMs||0)>=1100){
        const region=world.region;
        const side=player.x<region.width*.5?-1:1;
        let selected=null;
        for(const sign of [side,-side]){
          for(const shift of [340,430,520]){
            const x=clamp(player.x+sign*shift,155,region.width-155);
            const y=clamp(player.y+20,155,region.height-155);
            if(Math.abs(player.x-x)<190||collidesWithIsland(region,x,y,130))continue;
            selected={x,y,heading:player.x>x?90:270};break;
          }
          if(selected)break;
        }
        if(selected){
          monster.ambushFrom={x:monster.x,y:monster.y};
          monster.ambushTo=selected;
          monster.ambushPhase='diving';
          monster.ambushElapsedMs=0;
          monster.ambushMisalignedMs=0;
        }
      }
    }
  }else{
    monster.ambushElapsedMs=(monster.ambushElapsedMs||0)+dt;
    if(monster.ambushPhase==='diving'&&monster.ambushElapsedMs>=680){
      monster.ambushPhase='submerged';monster.ambushElapsedMs=0;
    }else if(monster.ambushPhase==='submerged'){
      const t=clamp(monster.ambushElapsedMs/1750,0,1);
      const eased=t*t*(3-2*t);
      monster.x=monster.ambushFrom.x+(monster.ambushTo.x-monster.ambushFrom.x)*eased;
      monster.y=monster.ambushFrom.y+(monster.ambushTo.y-monster.ambushFrom.y)*eased;
      if(t>=1){
        monster.heading=monster.ambushTo.heading;
        monster.ambushPhase='surfacing';monster.ambushElapsedMs=0;
      }
    }else if(monster.ambushPhase==='surfacing'&&monster.ambushElapsedMs>=720){
      monster.ambushPhase='surface';monster.ambushElapsedMs=0;
      monster.ambushSurfaceMs=0;
      monster.ambushMisalignedMs=0;
      monster.ambushAttackReadyMs=650;
    }
  }
  monster.ambushAttackReadyMs=Math.max(0,(monster.ambushAttackReadyMs||0)-dt);
  monster.animationTimeMs=0;
}
export function updateMonsterPopulation(world, stepMs) {
  for (const monster of world.entities.values()) {
    if (monster.type !== 'monster') continue;
    if(monster.archetype==='sea-monster-leviathan'&&monster.health>0){
      updateLeviathanAmbush(monster,world,stepMs);
    }else{
      monster.animationTimeMs = (monster.animationTimeMs + stepMs) % 600000;
    }
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
