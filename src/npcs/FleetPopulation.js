import { seekingOrbMovementSpeed } from '../combat/SeekingOrbSlow.js';
import { collidesWithIsland, resolveIslandMovement } from '../world/IslandCollision.js';
import { FLEET_REGIONS, fleetWaveStatus } from '../missions/FleetCampaign.js';

const SHIPS=Object.freeze({
 shadow:'sombra-fugitiva-verde-fantasma',pumpkin:'galeao-frota-das-aboboras',
 red:'corsario-vermelho-sangue',ghost:'fantasma-esmeralda',
 frost:'corsario-geada-negra',thief:'ladrao-da-geada',northern:'ladrao-do-norte',
 gold:'galeao-dourado',eclipse:'galeao-eclipse',
 imperial:'galeao-negro-imperial',crimson:'galeao-caveira-rubra',
 veil:'corsario-do-veu-negro',market:'mercado-negro',
});
const FLEETS=Object.freeze({
 r3:['shadow','pumpkin','red','ghost'],
 r4:['frost','thief','red','shadow','northern'],
 r5:['eclipse','red','pumpkin','gold','market'],
 r6:['imperial','frost','red','northern','market'],
 r7:['crimson','red','pumpkin','imperial','shadow'],
 r8:['veil','shadow','market','ghost','red'],
 r9:['pumpkin','thief','gold','red','eclipse'],
 r10:['gold','ghost','crimson','imperial','market'],
 r11:['ghost','veil','frost','eclipse','shadow'],
 r12:['imperial','crimson','veil','eclipse','pumpkin','red'],
});
const NAMES=Object.freeze({
 shadow:'Sombra Veloz',pumpkin:'Saqueador das Abóboras',red:'Corsário Rubro',
 ghost:'Sentinela Esmeralda',frost:'Vigia da Geada',thief:'Pirata Gélido',
 northern:'Ladrão do Norte',gold:'Guarda Dourada',eclipse:'Corsário Eclipse',
 imperial:'Fragata Imperial',crimson:'Corsário da Caveira',veil:'Vigia do Véu',
 market:'Mercenário do Mercado Negro',
});
const number=id=>Math.max(1,Number(id.slice(1))||1);
function location(world,index,random){
 const {region}=world;
 for(let attempt=0;attempt<360;attempt++){
  const x=190+random()*(region.width-380),y=190+random()*(region.height-380);
  if(Math.hypot(x-region.spawn.x,y-region.spawn.y)<420)continue;
  if(collidesWithIsland(region,x,y,100))continue;
  if([...world.entities.values()].some(n=>n.health>0&&Math.hypot(x-n.x,y-n.y)<130))continue;
  return {x,y};
 }
 // Never add an unreachable NPC: candidates are validated again each world start.
 for(let y=190;y<region.height-190;y+=240)
  for(let x=190;x<region.width-190;x+=240)
   if(!collidesWithIsland(region,x,y,90)&&Math.hypot(x-region.spawn.x,y-region.spawn.y)>400
     &&![...world.entities.values()].some(n=>Math.hypot(x-n.x,y-n.y)<100))return{x,y};
 throw new Error('Não há área navegável para NPC '+region.id+' #'+index);
}
export function createFleetPopulation(world,random=Math.random,save={}){
 const id=world.region.id,plan=FLEET_REGIONS[id];
 if(!world.fleetNoRespawn||!plan||!FLEETS[id])return 0;
 const expected=id==='r3'?12:plan.enemyGoal;
 const defeated=new Set(save.fleetCampaign?.defeated?.[id]??[]);
 const wave=fleetWaveStatus(id,plan.enemyGoal,defeated.size);
 const start=wave?.start??0,unlocked=wave?.limit??expected;
 // Some saves already contain R4 legacy ship IDs. Do not spawn all 30 new
 // fleet IDs just because an older campaign has already recorded 24 defeats.
 // Keep the number of live ordinary opponents under the 20% wave cap.
 const active=wave?[...world.entities.values()].filter(n=>
   n.archetype==='fleet-raider'&&n.health>0).length:0;
 const slots=wave?Math.max(0,Math.ceil(plan.enemyGoal/5)-active):expected;
 const pool=FLEETS[id],rank=number(id);
 let added=0;
 for(let i=start;i<Math.min(expected,unlocked)&&added<slots;i++){
  const key=id+'-fleet-'+String(i+1).padStart(2,'0');
  if(defeated.has(key)||world.entities.has(key))continue;
  const type=pool[(i*7+Math.floor(i/Math.max(1,pool.length)))%pool.length];
  const position=location(world,i,random);
  const elite=i%7===0;
  const health=Math.round((id==='r3'?4500:id==='r4'?9000:16000+rank*3600)*(elite?1.9:1)*(1+(i%4)*.14));
  const speed=type==='shadow'?360:type==='thief'?340:type==='imperial'?180:240+(i%3)*22;
  world.entities.set(key,{
   id:key,type:'npc',archetype:'fleet-raider',name:(elite?'Capitão ':'')+NAMES[type],
   shipId:SHIPS[type],fleetId:id+'-'+type,
   x:position.x,y:position.y,heading:random()*360,
   health,maxHealth:health,speed,baseSpeed:speed,
   range:Math.min(1200,640+rank*34),damage:Math.max(2,Math.round((rank+2)*(elite?1.25:.75))),
   cannonSlots:elite?5:3,aggression:type==='shadow'?'flee':'attack',
   retaliationActive:type!=='shadow',state:'patrolling',
   patrolRemainingMs:0,fleetElite:elite,respawnRemainingMs:null,
  });
  added++;
 }
 return added;
}
export function updateFleetPopulation(world,deltaMs,random=Math.random){
 if(!world.fleetNoRespawn)return;
 const dt=Math.min(64,Math.max(0,deltaMs))/1000;
 const player=world.camera;
 for(const npc of world.entities.values()){
  if(npc.archetype!=='fleet-raider'||npc.health<=0)continue;
  if(Date.now()<(npc.frozenUntil||0))continue;
  const dx=player.x-npc.x,dy=player.y-npc.y,distance=Math.hypot(dx,dy);
  const retreat=npc.aggression==='flee'&&distance<670;
  const engage=npc.retaliationActive&&distance<Math.max(950,npc.range*1.1);
  npc.patrolRemainingMs=(npc.patrolRemainingMs??0)-deltaMs;
  let desired=npc.heading;
  if(retreat||engage)desired=(Math.atan2(retreat?-dx:dx,retreat?dy:-dy)*180/Math.PI+360)%360;
  else if(npc.patrolRemainingMs<=0){
   desired=(npc.heading+(random()-.5)*150+360)%360;
   npc.patrolHeading=desired;npc.patrolRemainingMs=900+random()*2300;
  }else desired=npc.patrolHeading??npc.heading;
  const turn=((desired-npc.heading+540)%360)-180;
  npc.heading=(npc.heading+Math.sign(turn)*Math.min(Math.abs(turn),180*dt)+360)%360;
  const speed=seekingOrbMovementSpeed(npc,npc.speed);
  const amount=retreat?speed*dt:engage?Math.min(speed*dt,Math.max(0,distance-250)):speed*dt*.52;
  const rad=npc.heading*Math.PI/180;
  const next=resolveIslandMovement(world.region,npc.x,npc.y,
   Math.max(85,Math.min(world.region.width-85,npc.x+Math.sin(rad)*amount)),
   Math.max(85,Math.min(world.region.height-85,npc.y-Math.cos(rad)*amount)),42);
  npc.x=next.x;npc.y=next.y;
 }
}
