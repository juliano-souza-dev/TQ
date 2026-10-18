import { getVisibleTreasures } from '../treasures/RegionTreasures.js';
import { collidesWithIsland } from '../world/IslandCollision.js';

// A campanha nova não depende do quadro de contratos das campanhas antigas.
export const FLEET_CAMPAIGN_VERSION=1;
export const FLEET_REGIONS=Object.freeze({
 r1:{name:'Enseada dos Aprendizes',enemyGoal:19,encounters:[{id:'terror-da-tabuada',name:'Terror da Tabuada',ship:'galeao-halloween-tabuada'}]},
 r2:{name:'Costa dos Corsários',enemyGoal:20,encounters:[{id:'fugitive-frigate',name:'Fragata Sombra Fugitiva',ship:null},{id:'r2-morbi',name:'Morbi · Galeão Dourado',ship:'galeao-dourado'}]},
 r3:{name:'Águas Escuras',enemyGoal:4,encounters:[{id:'r3-leviathan',name:'Leviatã das Águas Escuras',ship:null},{id:'terror-do-mar',name:'Terror do Mar',ship:'terror-do-mar'}]},
 r4:{name:'Terras Gélidas',enemyGoal:17,encounters:[{id:'r4-sombra-do-saque',name:'Sombra do Saque',ship:'sombra-fugitiva-verde-fantasma'}]},
 r5:{name:'Região 5',enemyGoal:28,encounters:[{id:'r5-eclipse',name:'Galeão Eclipse',ship:'galeao-eclipse'}]},
 r6:{name:'Região 6',enemyGoal:22,encounters:[{id:'r6-imperial',name:'Galeão Negro Imperial',ship:null}]},
 r7:{name:'Região 7',enemyGoal:24,encounters:[{id:'r7-crimson',name:'Galeão da Caveira Rubra',ship:'galeao-caveira-rubra'}]},
 r8:{name:'Região 8',enemyGoal:18,encounters:[{id:'r8-black-veil',name:'Corsário do Véu Negro',ship:'corsario-do-veu-negro'}]},
});
const ids=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>typeof x==='string'))];
export const fleetEnabled=save=>save?.fleetCampaign?.version===FLEET_CAMPAIGN_VERSION;
export function startFleetCampaign(save={}){
 const existing=save.equipment??{},counts=existing.cannonCounts??{};
 return {
  fleetCampaign:{version:FLEET_CAMPAIGN_VERSION,region:1,defeated:{},treasures:{},bosses:{},completedRegions:[],finished:false},
  missions:{...(save.missions??{}),firstMission:'complete',corsair:'complete'},
  equipment:{...existing,equippedShipId:'starter-red-sails',
   ownedShipIds:ids([...(existing.ownedShipIds??[]),'starter-red-sails']),
   ownedCannonIds:ids([...(existing.ownedCannonIds??[]),'blue-gold-pirate']),
   cannonCounts:{...counts,'blue-gold-pirate':Math.max(3,Number(counts['blue-gold-pirate'])||0)}},
  ammunition:{...(save.ammunition??{}),'rusted-iron':Math.max(20000,Number(save.ammunition?.['rusted-iron'])||0)},
  progression:{...(save.progression??{}),activeRegion:1,unlockedRegion:Math.max(1,Number(save.progression?.unlockedRegion)||1)},
  playerPosition:null,
 };
}
export function getFleetTreasures(save={},regionId,region){
 const source=getVisibleTreasures({},0,regionId==='r1'?'r1':'r2');
 const taken=new Set(ids(save.fleetCampaign?.treasures?.[regionId]));
 return source.map(t=>({...t,id:'fleet-'+regionId+'-'+t.id}))
   .filter(t=>!region||!collidesWithIsland(region,t.x,t.y,60))
   .filter(t=>!taken.has(t.id));
}
export function fleetTreasureGoal(regionId,region){
 return getFleetTreasures({},regionId,region).length;
}
export function recordFleetTreasure(save,regionId,treasureId){
 if(!fleetEnabled(save)||'r'+save.fleetCampaign.region!==regionId||!treasureId?.startsWith('fleet-'+regionId+'-'))return null;
 const valid=getVisibleTreasures({},0,regionId==='r1'?'r1':'r2')
   .some(t=>'fleet-'+regionId+'-'+t.id===treasureId);
 if(!valid)return null;
 const c=save.fleetCampaign,old=ids(c.treasures?.[regionId]);
 if(old.includes(treasureId))return null;
 return {
  fleetCampaign:{...c,treasures:{...(c.treasures??{}),[regionId]:[...old,treasureId]}},
  profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+100},
  ammunition:{...(save.ammunition??{}),'rusted-iron':(Number(save.ammunition?.['rusted-iron'])||0)+350},
 };
}
export function fleetRole(regionId,npc){
 if(!npc)return null;
 const kind=npc.archetype,id=npc.id;
 if(regionId==='r1')return kind==='terror-da-tabuada'?'boss':kind==='red-sail-corsair'?'enemy':null;
 if(regionId==='r2')return id==='r2-morbi'?'boss':kind==='fugitive-frigate'?'boss':kind==='red-sail-corsair'?'enemy':null;
 if(regionId==='r3')return kind==='terror-do-mar'?'boss':id==='r3-leviathan'?'boss':['terror-guardian','r3-pumpkin-galleon'].includes(kind)?'enemy':null;
 if(regionId==='r4')return id==='r4-sombra-do-saque'?'boss':['vigia-da-geada','r4-ladrao-gelido'].includes(kind)?'enemy':null;
 return null;
}
export function encounterMatches(encounter,npc){
 return encounter?.id===npc?.id ||
  encounter?.id==='terror-da-tabuada'&&npc?.archetype==='terror-da-tabuada' ||
  encounter?.id==='terror-do-mar'&&npc?.archetype==='terror-do-mar' ||
  encounter?.id==='fugitive-frigate'&&npc?.archetype==='fugitive-frigate';
}
export function fleetProgress(save={},regionId,treasureGoal=0){
 const plan=FLEET_REGIONS[regionId],c=save.fleetCampaign??{};
 if(!plan)return null;
 const defeated=Math.min(plan.enemyGoal,ids(c.defeated?.[regionId]).length),
  collected=Math.min(treasureGoal,ids(c.treasures?.[regionId]).length),
  bosses=ids(c.bosses?.[regionId]);
 const encounterIndex=plan.encounters.findIndex(e=>!bosses.includes(e.id));
 const ready=defeated>=plan.enemyGoal&&collected>=treasureGoal;
 return {plan,regionId,defeated,enemyGoal:plan.enemyGoal,collected,treasureGoal,
   encounterIndex,encounter:ready&&encounterIndex>=0?plan.encounters[encounterIndex]:null,
   ready,complete:ready&&encounterIndex<0};
}
export function recordFleetDefeat(save,regionId,npc){
 if(!fleetEnabled(save)||'r'+save.fleetCampaign.region!==regionId)return null;
 const role=fleetRole(regionId,npc);if(!role)return null;
 const c=save.fleetCampaign;
 if(role==='enemy'){
  const old=ids(c.defeated?.[regionId]);if(old.includes(npc.id))return null;
  return {fleetCampaign:{...c,defeated:{...(c.defeated??{}),[regionId]:[...old,npc.id]}}};
 }
 const plan=FLEET_REGIONS[regionId];
 const encounter=plan.encounters.find(e=>encounterMatches(e,npc));
 if(!encounter)return null;
 const old=ids(c.bosses?.[regionId]);if(old.includes(encounter.id))return null;
 const progress=fleetProgress(save,regionId,save.fleetCampaign?.treasureGoal?.[regionId]??0);
 if(!progress?.ready||progress.encounter?.id!==encounter.id)return null;
 const equipment=save.equipment??{};
 return {fleetCampaign:{...c,bosses:{...(c.bosses??{}),[regionId]:[...old,encounter.id]}},
  ...(encounter.ship?{equipment:{...equipment,ownedShipIds:ids([...(equipment.ownedShipIds??[]),encounter.ship])}}:{})};
}
export function fleetLabel(p){
 if(!p)return 'Campanha naval';
 if(p.complete)return '🏆 '+p.plan.name+' concluída!';
 const common='⚔️ '+p.defeated+'/'+p.enemyGoal+' inimigos  ·  🧰 '+p.collected+'/'+p.treasureGoal+' tesouros';
 return p.ready?'☠️ '+p.encounter.name+' está perseguindo você! · '+common:common;
}
export function finishFleetRegion(save,regionId,treasureGoal){
 const p=fleetProgress(save,regionId,treasureGoal),c=save.fleetCampaign;
 if(!p?.complete||!fleetEnabled(save)||c.completedRegions?.includes(regionId))return null;
 const number=Number(regionId.slice(1)),next=Math.min(4,number+1);
 return {fleetCampaign:{...c,region:next,
    completedRegions:ids([...(c.completedRegions??[]),regionId]),finished:number===4},
  progression:{...(save.progression??{}),activeRegion:next,
    unlockedRegion:Math.max(next,Number(save.progression?.unlockedRegion)||1)},
  playerPosition:null};
}
