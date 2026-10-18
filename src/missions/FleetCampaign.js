import { getVisibleTreasures } from '../treasures/RegionTreasures.js';
import { collidesWithIsland } from '../world/IslandCollision.js';

// Saves from the first fleet campaign keep the same version and their completed objectives.
export const FLEET_CAMPAIGN_VERSION=1;
export const FLEET_REGIONS=Object.freeze({
 r1:{name:'Enseada dos Aprendizes',enemyGoal:19,monsterGoal:2,encounters:[{id:'terror-da-tabuada',name:'Terror da Tabuada',ship:'galeao-halloween-tabuada'}]},
 r2:{name:'Costa dos Corsários',enemyGoal:20,monsterGoal:2,encounters:[{id:'fugitive-frigate',name:'Fragata Sombra Fugitiva',ship:null},{id:'r2-morbi',name:'Morbi · Galeão Dourado',ship:'galeao-dourado'}]},
 r3:{name:'Águas Escuras',enemyGoal:16,monsterGoal:0,encounters:[{id:'r3-leviathan',name:'Leviatã das Águas Escuras',ship:null},{id:'terror-do-mar',name:'Terror do Mar',ship:'terror-do-mar'}]},
 r4:{name:'Terras Gélidas',enemyGoal:24,monsterGoal:0,encounters:[{id:'r4-sombra-do-saque',name:'Sombra do Saque',ship:null}]},
 r5:{name:'Costa do Eclipse',enemyGoal:28,monsterGoal:2,encounters:[{id:'r5-eclipse',name:'Galeão Eclipse',ship:'galeao-eclipse'}]},
 r6:{name:'Estreito de Ferro',enemyGoal:22,monsterGoal:2,encounters:[{id:'r6-imperial',name:'Galeão Negro Imperial',ship:null}]},
 r7:{name:'Baía Rubra',enemyGoal:24,monsterGoal:2,encounters:[{id:'r7-crimson',name:'Galeão da Caveira Rubra',ship:'galeao-caveira-rubra'}]},
 r8:{name:'Mar do Véu Negro',enemyGoal:18,monsterGoal:2,encounters:[{id:'r8-black-veil',name:'Corsário do Véu Negro',ship:'corsario-do-veu-negro'}]},
 r9:{name:'Arquipélago das Correntes',enemyGoal:26,monsterGoal:2,encounters:[{id:'r9-pumpkin',name:'Almirante das Abóboras',ship:null,shipId:'galeao-frota-das-aboboras'}]},
 r10:{name:'Mar das Nove Tabuadas',enemyGoal:32,monsterGoal:2,encounters:[{id:'r10-rose',name:'Capitã das Rosas Douradas',ship:'galeao-rosas-de-ouro',shipId:'galeao-rosas-de-ouro'}]},
 r11:{name:'Abismo das Provas',enemyGoal:36,monsterGoal:2,encounters:[{id:'r11-ghost',name:'Almirante Esmeralda',ship:null,shipId:'fantasma-esmeralda'}]},
 r12:{name:'Horizonte Supremo',enemyGoal:40,monsterGoal:2,encounters:[{id:'r12-last',name:'Imperador do Horizonte',ship:null,shipId:'galeao-negro-imperial'}]},
});
const ids=a=>[...new Set((Array.isArray(a)?a:[]).filter(x=>typeof x==='string'))];
export const fleetEnabled=save=>save?.fleetCampaign?.version===FLEET_CAMPAIGN_VERSION;
export function startFleetCampaign(save={}){
 const existing=save.equipment??{},counts=existing.cannonCounts??{};
 return {
  fleetCampaign:{version:FLEET_CAMPAIGN_VERSION,region:1,defeated:{},monsters:{},treasures:{},bosses:{},preparedRegions:[],completedRegions:[],finished:false},
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
 const valid=getVisibleTreasures({},0,regionId==='r1'?'r1':'r2').some(t=>'fleet-'+regionId+'-'+t.id===treasureId);
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
 const kind=npc.archetype,id=npc.id,plan=FLEET_REGIONS[regionId];
 if(!plan)return null;
 if(plan.encounters.some(e=>encounterMatches(e,npc)))return 'boss';
 if(npc.type==='monster')return 'monster';
 if(kind==='fleet-raider'||kind==='r3-pumpkin-galleon')return 'enemy';
 if(regionId==='r1')return kind==='red-sail-corsair'?'enemy':null;
 if(regionId==='r2')return kind==='red-sail-corsair'?'enemy':null;
 if(regionId==='r3')return kind==='terror-guardian'?'enemy':null;
 if(regionId==='r4')return ['vigia-da-geada','r4-ladrao-gelido'].includes(kind)?'enemy':null;
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
  monsters=Math.min(plan.monsterGoal??0,ids(c.monsters?.[regionId]).length),
  collected=Math.min(treasureGoal,ids(c.treasures?.[regionId]).length),
  bosses=ids(c.bosses?.[regionId]);
 const encounterIndex=plan.encounters.findIndex(e=>!bosses.includes(e.id));
 const missionOneComplete=defeated>=plan.enemyGoal&&collected>=treasureGoal&&monsters>=plan.monsterGoal;
 const prepared=ids(c.preparedRegions).includes(regionId);
 const ready=missionOneComplete&&prepared;
 return {plan,regionId,defeated,enemyGoal:plan.enemyGoal,monsters,monsterGoal:plan.monsterGoal,
  collected,treasureGoal,prepared,missionOneComplete,mission:encounterIndex<0?2:ready?2:1,
  encounterIndex,encounter:ready&&encounterIndex>=0?plan.encounters[encounterIndex]:null,
  ready,complete:ready&&encounterIndex<0};
}
export function recordFleetDefeat(save,regionId,npc){
 if(!fleetEnabled(save)||'r'+save.fleetCampaign.region!==regionId)return null;
 const role=fleetRole(regionId,npc);if(!role)return null;
 const c=save.fleetCampaign;
 if(role==='enemy'||role==='monster'){
  const key=role==='monster'?'monsters':'defeated',old=ids(c[key]?.[regionId]);
  if(old.includes(npc.id))return null;
  return {fleetCampaign:{...c,[key]:{...(c[key]??{}),[regionId]:[...old,npc.id]}}};
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
 if(p.complete)return '🏆 Missão 2 concluída! Navegue até a saída marcada.';
 if(p.missionOneComplete&&!p.prepared)return '🎁 Missão 1 concluída! Recolha a preparação para o chefe.';
 if(p.ready)return '☠️ Missão 2: '+p.encounter.name+' · Derrote o chefe!';
 return '📜 Missão 1: ⚔️ '+p.defeated+'/'+p.enemyGoal+
  ' · 🐙 '+p.monsters+'/'+p.monsterGoal+' · 🧰 '+p.collected+'/'+p.treasureGoal;
}
export function finishFleetRegion(save,regionId,treasureGoal){
 const p=fleetProgress(save,regionId,treasureGoal),c=save.fleetCampaign;
 if(!p?.complete||!fleetEnabled(save)||c.completedRegions?.includes(regionId))return null;
 const number=Number(regionId.slice(1)),next=Math.min(12,number+1);
 return {fleetCampaign:{...c,region:next,
    completedRegions:ids([...(c.completedRegions??[]),regionId]),finished:number===12},
  progression:{...(save.progression??{}),activeRegion:next,
    unlockedRegion:Math.max(next,Number(save.progression?.unlockedRegion)||1)},
  playerPosition:null};
}
