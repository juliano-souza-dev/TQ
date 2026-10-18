import { getVisibleTreasures, treasureReward } from '../treasures/RegionTreasures.js';
import { collidesWithIsland } from '../world/IslandCollision.js';
import { FLEET_PLAYER_SHIPS, bestFleetLoadout } from '../ships/FleetAutoEquipment.js';

// Saves from the first fleet campaign keep the same version and their completed objectives.
export const FLEET_CAMPAIGN_VERSION=1;
export const FLEET_REGIONS=Object.freeze({
 r1:{name:'Enseada dos Aprendizes',enemyGoal:19,monsterGoal:2,encounters:[{id:'terror-da-tabuada',name:'Terror da Tabuada',ship:'galeao-halloween-tabuada'}]},
 r2:{name:'Costa dos Corsários',enemyGoal:20,monsterGoal:2,encounters:[{id:'fugitive-frigate',name:'Fragata Sombra Fugitiva',ship:'fragata-sombra-cacadora'}]},
 r3:{name:'Águas Escuras',enemyGoal:16,monsterGoal:0,encounters:[{id:'r3-leviathan',name:'Leviatã das Águas Escuras',ship:null},{id:'terror-do-mar',name:'Terror do Mar',ship:'terror-do-mar'}]},
 r4:{name:'Terras Gélidas',enemyGoal:30,monsterGoal:0,encounters:[{id:'r4-sombra-do-saque',name:'Sombra do Saque',ship:null}]},
 r5:{name:'Costa do Eclipse',enemyGoal:28,monsterGoal:2,encounters:[{id:'r2-morbi',name:'Morbi · Galeão Dourado',ship:'galeao-dourado'}]},
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
export const FLEET_WAVE_COUNT=5;
export const hasFleetWaves=regionId=>Number(String(regionId).slice(1))>=4 && !!FLEET_REGIONS[regionId];
// Deterministic boundaries preserve the total objective while limiting how
// many enemies or treasures exist in the ocean simultaneously. Each next 20%
// is unlocked only after the preceding allocation has been completed.
export function fleetWaveStatus(regionId,total,completed){
 const goal=Math.max(0,Math.floor(Number(total)||0));
 const done=Math.max(0,Math.min(goal,Math.floor(Number(completed)||0)));
 if(!hasFleetWaves(regionId)||goal===0)return null;
 let finished=0;
 for(let i=1;i<FLEET_WAVE_COUNT;i++)
  if(done>=Math.ceil(goal*i/FLEET_WAVE_COUNT))finished=i;
 const stage=finished+1;
 const limit=Math.ceil(goal*stage/FLEET_WAVE_COUNT);
 const start=Math.ceil(goal*finished/FLEET_WAVE_COUNT);
 return {stage,waves:FLEET_WAVE_COUNT,limit,start,active:Math.max(0,limit-done),
  remaining:Math.max(0,goal-done),done:done>=goal};
}
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
const fleetTreasureCatalogCache=new Map();
function fleetTreasureCatalog(regionId,region){
 // The greedy distance-spaced source catalog is expensive to rebuild every
 // frame. Geography does not change when the ocean shader or weather updates.
 const key=regionId+(region?'@geography':'@unfiltered');
 const cached=fleetTreasureCatalogCache.get(key);
 if(cached&&cached.islands===region?.islands)return cached.treasures;
 const source=getVisibleTreasures({},0,regionId==='r1'?'r1':'r2',
  regionId==='r4'?.6:.4);
 const treasures=source.map(t=>({...t,id:'fleet-'+regionId+'-'+t.id}))
  .filter(t=>!region||!collidesWithIsland(region,t.x,t.y,60));
 fleetTreasureCatalogCache.set(key,{islands:region?.islands,treasures});
 return treasures;
}
export function getFleetTreasures(save={},regionId,region){
 const source=fleetTreasureCatalog(regionId,region);
 const taken=new Set(ids(save.fleetCampaign?.treasures?.[regionId]));
 const collected=source.filter(t=>taken.has(t.id)).length;
 const wave=fleetWaveStatus(regionId,source.length,collected);
 const visible=wave?source.slice(0,wave.limit):source;
 return visible.filter(t=>!taken.has(t.id));
}
export function fleetTreasureGoal(regionId,region){
 return fleetTreasureCatalog(regionId,region).length;
}
export function recordFleetTreasure(save,regionId,treasureId,region){
 if(!fleetEnabled(save)||'r'+save.fleetCampaign.region!==regionId||!treasureId?.startsWith('fleet-'+regionId+'-'))return null;
 // Check the live unlocked wave rather than awarding a chest that is still
 // hidden. An optional region keeps the collision rules identical to rendering.
 const valid=getFleetTreasures(save,regionId,region).some(t=>t.id===treasureId);
 if(!valid)return null;
 const c=save.fleetCampaign,old=ids(c.treasures?.[regionId]);
 if(old.includes(treasureId))return null;
 const reward=treasureReward(treasureId);
 return {
  fleetCampaign:{...c,treasures:{...(c.treasures??{}),[regionId]:[...old,treasureId]}},
  profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+100},
  ammunition:{...(save.ammunition??{}),'rusted-iron':(Number(save.ammunition?.['rusted-iron'])||0)+350},
  consumables:{...(save.consumables??{}),quantities:{...(save.consumables?.quantities??{}),
   'double-damage':(Number(save.consumables?.quantities?.['double-damage'])||0)+reward.doubleDamage,
   'flame-5x':(Number(save.consumables?.quantities?.['flame-5x'])||0)+reward.flame5x}},
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
 // Old R5 Eclipse victories remain complete after moving the new boss to R5.
 if(regionId==='r5'&&bosses.includes('r5-eclipse'))bosses.push('r2-morbi');
 const encounterIndex=plan.encounters.findIndex(e=>!bosses.includes(e.id));
 const missionOneComplete=defeated>=plan.enemyGoal&&collected>=treasureGoal&&monsters>=plan.monsterGoal;
 const prepared=ids(c.preparedRegions).includes(regionId);
 const ready=missionOneComplete&&prepared;
 const enemyWave=fleetWaveStatus(regionId,plan.enemyGoal,defeated);
 const treasureWave=fleetWaveStatus(regionId,treasureGoal,collected);
 return {plan,regionId,defeated,enemyGoal:plan.enemyGoal,monsters,monsterGoal:plan.monsterGoal,
  collected,treasureGoal,enemyWave,treasureWave,prepared,missionOneComplete,mission:encounterIndex<0?2:ready?2:1,
  encounterIndex,encounter:ready&&encounterIndex>=0?plan.encounters[encounterIndex]:null,
  ready,complete:ready&&encounterIndex<0};
}
// Boss prizes are separate from the first-mission preparation and persist in saves.
export const FLEET_BOSS_CANNON_REWARDS=Object.freeze({
 r1:Object.freeze({cannon:'royal-lion',quantity:7,ammo:'rusted-iron',ammoAmount:30000}),
 r2:Object.freeze({cannon:'aetherion-mk1',quantity:2,ammo:'aetherion-seeker',ammoAmount:60000}),
});
export function claimFleetBossPrize(save,regionId,encounterId){
 if(!fleetEnabled(save))return null;
 const c=save.fleetCampaign,plan=FLEET_REGIONS[regionId];
 const encounter=plan?.encounters.find(e=>e.id===encounterId);
 if(!encounter||ids(c.claimedBossPrizes).includes(encounterId))return null;
 if(!ids(c.bosses?.[regionId]).includes(encounterId))return null;
 // Only the final region boss gives the ship and the new cannon battery.
 const final=plan.encounters[plan.encounters.length-1]?.id===encounterId;
 if(!final)return null;
 const reward=FLEET_BOSS_CANNON_REWARDS[regionId];
 const e=save.equipment??{},counts={...(e.cannonCounts??{})};
 const ownedShipIds=ids([...(e.ownedShipIds??[]),...(encounter.ship?[encounter.ship]:[])]);
 const ownedCannonIds=ids([...(e.ownedCannonIds??[]),...(reward?[reward.cannon]:[])]);
 if(reward)counts[reward.cannon]=Math.max(Number(counts[reward.cannon])||0,reward.quantity);
 const equip=encounter.ship && 'r'+c.region===regionId;
 const equippedShipId=equip?encounter.ship:e.equippedShipId;
 let equipment={...e,ownedShipIds,ownedCannonIds,cannonCounts:counts,
   ...(equippedShipId?{equippedShipId}:{})};
 if(equip){
   const ship=FLEET_PLAYER_SHIPS.find(item=>item.id===encounter.ship);
   if(ship)equipment={...equipment,
     loadout:{...(e.loadout??{}),[ship.id]:bestFleetLoadout({...save,equipment},ship)}};
 }
 const ammunition=reward?{...(save.ammunition??{}),
   [reward.ammo]:Math.max(Number(save.ammunition?.[reward.ammo])||0,reward.ammoAmount)}:undefined;
 // The newly conquered ship is seaworthy; restore its hull only upon first award.
 const playerShip=FLEET_PLAYER_SHIPS.find(ship=>ship.id===encounter.ship);
 const combat=equip&&playerShip?{...(save.combat??{}),
   shipHealth:Math.max(100,Number(playerShip.maxHealth)||100),repairingUntil:null,repairingFrom:null}:undefined;
 return {
   fleetCampaign:{...c,claimedBossPrizes:ids([...(c.claimedBossPrizes??[]),encounterId])},
   equipment,
   ...(ammunition?{ammunition}:{}),
   ...(combat?{combat}:{})
 };
}
// For a victory saved before the rewards fix: grant once, without resetting
// kills, treasure objectives, active region or already collected inventory.
export function reconcileFleetBossPrizes(save){
 if(!fleetEnabled(save))return null;
 let current=save,changed=false;
 for(const [regionId,plan] of Object.entries(FLEET_REGIONS)){
  const final=plan.encounters[plan.encounters.length-1];
  if(!ids(current.fleetCampaign?.bosses?.[regionId]).includes(final.id))continue;
  const patch=claimFleetBossPrize(current,regionId,final.id);
  if(patch){current={...current,...patch};changed=true;}
 }
 if(!changed)return null;
 return Object.fromEntries(Object.keys(current)
  .filter(k=>current[k]!==save[k]).map(k=>[k,current[k]]));
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
 const base={...save,fleetCampaign:{...c,
    bosses:{...(c.bosses??{}),[regionId]:[...old,encounter.id]}}};
 const prize=claimFleetBossPrize(base,regionId,encounter.id);
 return prize?{...prize}:{fleetCampaign:base.fleetCampaign};
}
// Award +2 of each consumable at the end of EACH fleet mission (1 and 2).
// The saved claim key prevents duplicate grants after refresh or re-entry.
export function claimFleetMissionConsumables(save,regionId,mission){
 if(!fleetEnabled(save)||!FLEET_REGIONS[regionId]||![1,2].includes(mission))return null;
 const p=fleetProgress(save,regionId,save.fleetCampaign?.treasureGoal?.[regionId]??0);
 if(!p||(mission===1?!p.missionOneComplete||!p.prepared:!p.complete))return null;
 const c=save.fleetCampaign,key=regionId+':'+mission;
 const oldConsumables=ids(c.claimedMissionConsumables),oldDouble=ids(c.claimedMissionDoubleDamage);
 const giveOld=!oldConsumables.includes(key),giveDouble=!oldDouble.includes(key);
 if(!giveOld&&!giveDouble)return null;
 const consumables=save.consumables??{},quantities=consumables.quantities??{};
 return {fleetCampaign:{...c,
   claimedMissionConsumables:giveOld?[...oldConsumables,key]:oldConsumables,
   claimedMissionDoubleDamage:giveDouble?[...oldDouble,key]:oldDouble},
  consumables:{...consumables,quantities:{...quantities,
   'flame-5x':(Number(quantities['flame-5x'])||0)+(giveOld?2:0),
   'speed-plus':(Number(quantities['speed-plus'])||0)+(giveOld?2:0),
   'double-damage':(Number(quantities['double-damage'])||0)+(giveDouble?1000:0)}}};
}
export function fleetLabel(p){
 if(!p)return 'Campanha naval';
 if(p.complete)return '🏆 Missão 2 concluída! Navegue até a saída marcada.';
 if(p.missionOneComplete&&!p.prepared)return '🎁 Missão 1 concluída! Recolha a preparação para o chefe.';
 if(p.ready)return '☠️ Missão 2: '+p.encounter.name+' · Derrote o chefe!';
 return '📜 Missão 1: ⚔️ '+p.defeated+'/'+p.enemyGoal
  +(p.enemyWave?' (onda '+p.enemyWave.stage+'/5)':'')
  +' · 🐙 '+p.monsters+'/'+p.monsterGoal
  +' · 🧰 '+p.collected+'/'+p.treasureGoal
  +(p.treasureWave?' (onda '+p.treasureWave.stage+'/5)':'');
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
