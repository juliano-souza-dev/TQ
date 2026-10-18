import { CANNONS } from '../items/EquipmentCatalog.js';
import {HORIZON_HARPOON_ID,HORIZON_HARPOON_AMMO_ID} from '../combat/HarpoonCatalog.js';
import { STARTER_SHIP, HALLOWEEN_TABUADA_SHIP, GOLDEN_GALLEON_SHIP,
  SHADOW_CHASER_SHIP, TERROR_DO_MAR_SHIP, FROZEN_LANDS_GALLEON_SHIP,
  ECLIPSE_SHIP, CRIMSON_SKULL_GALLEON_SHIP, BLACK_VEIL_CORSAIR_SHIP, ROSE_GOLD_SHIP } from './ShipRegistry.js';
import { EMERALD_GHOST_SHIP } from './EmeraldGhostShip.js';
import { GREEN_GHOST_FUGITIVE_SHIP } from './FugitiveFrigateShip.js';

export const PLAYABLE_TERROR_DO_MAR=Object.freeze({...TERROR_DO_MAR_SHIP,
  status:'campaign-reward',playable:true,npcEnabled:false,rewardEnabled:true,maxHealth:2000});
export const PLAYABLE_SHADOW_THIEF=Object.freeze({...GREEN_GHOST_FUGITIVE_SHIP,
  status:'campaign-reward',playable:true,npcEnabled:false,rewardEnabled:true,
  cannonSlots:4,cannonLayout:Object.freeze({port:4,starboard:4,bow:0,stern:0}),maxHealth:600});
export const PLAYABLE_FROZEN_LANDS=Object.freeze({...FROZEN_LANDS_GALLEON_SHIP,
  status:'campaign-reward',playable:true,npcEnabled:false,rewardEnabled:true,maxHealth:3600});
export const PLAYABLE_EMERALD_GHOST=Object.freeze({...EMERALD_GHOST_SHIP,
  status:'campaign-reward',playable:true,npcEnabled:false,rewardEnabled:true,
  cannonSlots:7,cannonLayout:Object.freeze({port:7,starboard:7,bow:0,stern:0}),
  speed:Object.freeze({min:290,initial:350,max:450}),maxHealth:2400});
export const PLAYABLE_ECLIPSE=Object.freeze({...ECLIPSE_SHIP,status:'campaign-reward',playable:true,rewardEnabled:true,maxHealth:4000});
export const PLAYABLE_CRIMSON=Object.freeze({...CRIMSON_SKULL_GALLEON_SHIP,status:'campaign-reward',playable:true,rewardEnabled:true,
  speed:Object.freeze({min:250,initial:310,max:385}),maxHealth:5300});
export const PLAYABLE_BLACK_VEIL=Object.freeze({...BLACK_VEIL_CORSAIR_SHIP,status:'campaign-reward',playable:true,rewardEnabled:true,
  speed:Object.freeze({min:290,initial:340,max:440}),maxHealth:6100});
export const PLAYABLE_ROSE_GOLD=Object.freeze({...ROSE_GOLD_SHIP,status:'campaign-reward',playable:true,rewardEnabled:true,maxHealth:6800});
export const FLEET_PLAYER_SHIPS=Object.freeze([STARTER_SHIP,HALLOWEEN_TABUADA_SHIP,
  SHADOW_CHASER_SHIP,GOLDEN_GALLEON_SHIP,PLAYABLE_TERROR_DO_MAR,PLAYABLE_SHADOW_THIEF,PLAYABLE_FROZEN_LANDS,PLAYABLE_EMERALD_GHOST,
  PLAYABLE_ECLIPSE,PLAYABLE_CRIMSON,PLAYABLE_BLACK_VEIL,PLAYABLE_ROSE_GOLD]);

const count=(equipment,id)=>Math.max(0,Math.floor(Number(equipment?.cannonCounts?.[id])||0));
const uniq=values=>[...new Set(values)];
export function grantFleetPreparation(save,regionId,{fugitive=false}={}){
 const e=save.equipment??{},counts={...(e.cannonCounts??{})};
 const ownedShipIds=uniq([...(e.ownedShipIds??[]),'starter-red-sails']);
 const ownedCannonIds=uniq([...(e.ownedCannonIds??[]),'blue-gold-pirate']);
 let cannon=null,qty=0,ammoId='rusted-iron',ammoQty=0;
 if(regionId==='r1'){cannon='blue-gold-pirate';qty=3;ammoQty=20000;}
 if(regionId==='r2'){cannon=fugitive?'aetherion-mk1':'royal-lion';qty=fugitive?2:7;ammoId=fugitive?'aetherion-seeker':'rusted-iron';ammoQty=fugitive?60000:30000;}
 if(regionId==='r3'){cannon='royal-lion';qty=7;ammoQty=80000;ownedShipIds.push(PLAYABLE_EMERALD_GHOST.id);}
 if(regionId==='r4'){cannon='ice-terror';qty=12;ammoId='frozen-explosion';ammoQty=60000;}
 if(Number(regionId.slice(1))>=5){cannon='ice-terror';qty=12;ammoId='frozen-explosion';ammoQty=40000+Number(regionId.slice(1))*2500;}
 if(fugitive)ownedShipIds.push('fragata-sombra-cacadora');
 if(cannon){counts[cannon]=Math.max(count(e,cannon),qty);ownedCannonIds.push(cannon);}
 const stock=save.ammunition??{};
 return {equipment:{...e,cannonCounts:counts,ownedCannonIds:uniq(ownedCannonIds),
   ownedShipIds:uniq(ownedShipIds)},
  ammunition:{...stock,[ammoId]:Math.max(Number(stock[ammoId])||0,ammoQty)},
  ...(regionId==='r3'?{
    harpoonAmmo:{...(save.harpoonAmmo??{}),[HORIZON_HARPOON_AMMO_ID]:Math.max(1200,Number(save.harpoonAmmo?.[HORIZON_HARPOON_AMMO_ID])||0)},
    equipment:{...e,cannonCounts:counts,ownedCannonIds:uniq(ownedCannonIds),ownedShipIds:uniq(ownedShipIds),
      ownedHarpoonIds:uniq([...(e.ownedHarpoonIds??[]),HORIZON_HARPOON_ID]),equippedHarpoonId:HORIZON_HARPOON_ID},
  }: {})};
}
export function grantFleetEntry(save,regionId){
 const e=save.equipment??{},ownedShipIds=uniq(e.ownedShipIds??[]);
 if(regionId==='r3'){
  // Four green-ship slots: exactly two tracking Aetherion cannons, then
  // the strongest conventional guns the player owns. Never take ammo away.
  const cannonCounts={...(e.cannonCounts??{}),
    'aetherion-mk1':Math.max(2,count(e,'aetherion-mk1')),
    'royal-lion':Math.max(2,count(e,'royal-lion'))};
  const armed={...e,ownedShipIds:uniq([...ownedShipIds,PLAYABLE_SHADOW_THIEF.id]),
    ownedCannonIds:uniq([...(e.ownedCannonIds??[]),'aetherion-mk1','royal-lion']),
    cannonCounts,equippedShipId:PLAYABLE_SHADOW_THIEF.id};
  return {equipment:{...armed,loadout:{...(e.loadout??{}),
    [PLAYABLE_SHADOW_THIEF.id]:bestFleetLoadout({...save,equipment:armed},PLAYABLE_SHADOW_THIEF)}}};
 }
 if(regionId==='r4'){
  const patch=grantFleetPreparation(save,regionId),next=patch.equipment;
  return {...patch,equipment:{...next,ownedShipIds:uniq([...next.ownedShipIds,PLAYABLE_FROZEN_LANDS.id]),equippedShipId:PLAYABLE_FROZEN_LANDS.id}};
 }
 return {};
}
export function fleetShipForRegion(save,regionId){
 const e=save.equipment??{},owned=new Set(['starter-red-sails',...(e.ownedShipIds??[])]);
 const prior={r1:owned.has('galeao-halloween-tabuada')?'galeao-halloween-tabuada':'starter-red-sails',r2:owned.has('fragata-sombra-cacadora')
    ?'fragata-sombra-cacadora':owned.has('galeao-halloween-tabuada')?'galeao-halloween-tabuada':'starter-red-sails',
   r3:owned.has(PLAYABLE_EMERALD_GHOST.id)?PLAYABLE_EMERALD_GHOST.id:owned.has(PLAYABLE_SHADOW_THIEF.id)?PLAYABLE_SHADOW_THIEF.id:'galeao-dourado',
   r4:owned.has(PLAYABLE_FROZEN_LANDS.id)?PLAYABLE_FROZEN_LANDS.id:'terror-do-mar',
   r5:owned.has(PLAYABLE_ECLIPSE.id)?PLAYABLE_ECLIPSE.id:e.equippedShipId,
   r7:owned.has(PLAYABLE_CRIMSON.id)?PLAYABLE_CRIMSON.id:e.equippedShipId,
   r8:owned.has(PLAYABLE_BLACK_VEIL.id)?PLAYABLE_BLACK_VEIL.id:e.equippedShipId}[regionId]||e.equippedShipId||'starter-red-sails';
 const id=owned.has(prior)?prior:e.equippedShipId;
 return FLEET_PLAYER_SHIPS.find(s=>s.id===id&&owned.has(s.id))??STARTER_SHIP;
}
export function cannonStrength(c){
 const damage=Number(c.baseDamage)||10*(Number(c.damageMultiplier)||1);
 const precision=Math.max(.1,Number(c.accuracy)||.8);
 const range=1+Math.min(1800,Number(c.range)||0)/10000;
 return damage*precision*range/Math.max(.25,Number(c.reloadSeconds)||1);
}
export function bestFleetLoadout(save,ship){
 const e=save.equipment??{},owned=new Set(e.ownedCannonIds??[]);
 const capacity=Math.max(0,Math.floor(Number(ship.cannonSlots)||0))
  +(save.shipUpgrades?.masterShipwright?5:0);
 const candidate=CANNONS.filter(c=>count(e,c.id)>0
  ||(e.cannonCounts?.[c.id]===undefined&&owned.has(c.id)))
  .sort((a,b)=>cannonStrength(b)-cannonStrength(a)||a.id.localeCompare(b.id));
 const slots=[];
 // Fleet's green ship reserves two guided-orb cannons even when the
 // inventory includes seven or more Aetherion batteries from older saves.
 const greenFleetShip=save.fleetCampaign?.version===1 && ship.id===PLAYABLE_SHADOW_THIEF.id;
 if(greenFleetShip){
  const guided=candidate.find(c=>c.id==='aetherion-mk1');
  if(guided){
   const quantity=e.cannonCounts?.[guided.id]===undefined?1:count(e,guided.id);
   for(let i=0;i<Math.min(2,quantity,capacity);i++)slots.push(guided.id);
  }
 }
 for(const cannon of candidate){
  if(greenFleetShip && (cannon.id==='aetherion-mk1'||cannon.exclusiveAmmoId))continue;
  const quantity=e.cannonCounts?.[cannon.id]===undefined?1:count(e,cannon.id);
  for(let i=0;i<quantity&&slots.length<capacity;i++)slots.push(cannon.id);
 }
 return [...slots,...Array(Math.max(0,capacity-slots.length)).fill(null)];
}
export function reconcileFleetEquipment(save,regionId){
 const ship=fleetShipForRegion(save,regionId),e=save.equipment??{};
 const expected=bestFleetLoadout(save,ship),current=e.loadout?.[ship.id]??[];
 if(e.equippedShipId===ship.id&&expected.length===current.length
  &&expected.every((id,index)=>id===current[index]))return null;
 return {equipment:{...e,equippedShipId:ship.id,
  loadout:{...(e.loadout??{}),[ship.id]:expected}}};
}
