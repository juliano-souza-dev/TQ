import { CANNONS, EVENTS, isItemVisible } from '../items/EquipmentCatalog.js';
import { HORIZON_HARPOON_ID } from '../combat/HarpoonCatalog.js';

export const R3_FIRST_MISSION_ID = 'r3-equip-golden';
export const R3_GOLDEN_SHIP_ID = 'galeao-dourado';
export const R3_MISSIONS = Object.freeze([Object.freeze({
  id: R3_FIRST_MISSION_ID,
  name: 'Preparar o Galeão Dourado',
  description: 'Prepare o Galeão Dourado para as Águas Escuras. Se já estiver equipado com a melhor artilharia disponível, a missão será concluída automaticamente. Caso contrário, vá ao Estaleiro para receber a equipagem automática.',
  objectives: [{kind:'r3-outfit',count:1,label:'Equipar o Galeão Dourado e a melhor artilharia disponível'}],
  reward: {},
}),Object.freeze({
  id:'r3-dark-waters-warning',
  name:'O Aviso das Águas Escuras',
  description:'Investigue três destroços, recupere seus diários resolvendo multiplicações e entregue os fragmentos no Porto das Missões. As páginas revelam uma pista sobre o Coração do Abismo.',
  objectives:[{kind:'wreck-diaries',count:3,label:'Recuperar os três diários dos destroços'},
    {kind:'return-port',count:1,label:'Entregar os diários no Porto das Missões'}],
  reward:{gold:100000,harpoonLaunchers:[HORIZON_HARPOON_ID]},
})]);

export function expectedR3GoldenLoadout(save, capacity) {
  const equipment = save?.equipment ?? {};
  const counts = equipment.cannonCounts ?? {};
  const owned = new Set(equipment.ownedCannonIds ?? []);
  const result = [];
  const sorted = CANNONS.filter(c => isItemVisible(c,EVENTS))
    .sort((a,b)=>(a.id==='aetherion-mk1'?-1:b.id==='aetherion-mk1'?1:0) ||
      (Number(b.damageMultiplier)||0)-(Number(a.damageMultiplier)||0) ||
      (Number(a.reloadSeconds)||0)-(Number(b.reloadSeconds)||0));
  for (const cannon of sorted) {
    if(!owned.has(cannon.id) && !(Number(counts[cannon.id])>0))continue;
    const quantity = Math.max(0,Math.floor(Number(counts[cannon.id])||0));
    const available = cannon.id==='aetherion-mk1' ? Math.min(2,quantity) : quantity;
    for(let i=0;i<available && result.length<capacity;i++)result.push(cannon.id);
  }
  return result;
}

export function r3GoldenReady(save) {
  const equipment = save?.equipment ?? {};
  if(equipment.equippedShipId!==R3_GOLDEN_SHIP_ID ||
      !(equipment.ownedShipIds??[]).includes(R3_GOLDEN_SHIP_ID))return false;
  const capacity = 7+(save?.shipUpgrades?.masterShipwright?5:0);
  const expected = expectedR3GoldenLoadout(save,capacity);
  const equipped = (equipment.loadout?.[R3_GOLDEN_SHIP_ID]??[]).filter(Boolean);
  return expected.length===equipped.length &&
    expected.slice().sort().every((id,i)=>equipped.slice().sort()[i]===id);
}

export const R3_WRECKS=Object.freeze([
  Object.freeze({id:'r3-wreck-1',x:1410,y:2240,name:'Destroços da Aurora Cinzenta'}),
  Object.freeze({id:'r3-wreck-2',x:2460,y:1750,name:'Destroços do Peregrino'}),
  Object.freeze({id:'r3-wreck-3',x:1980,y:3690,name:'Destroços do Último Farol'}),
]);
export function getR3Board(save={}) {
  const claimed=save.r3Campaign?.claimed??[];
  const firstDone=claimed.includes(R3_FIRST_MISSION_ID);
  const secondDone=claimed.includes('r3-dark-waters-warning');
  const wreckCount=Math.min(3,(save.r3Campaign?.wreckDiaries??[]).length);
  const delivered=Boolean(save.r3Campaign?.wreckDelivered);
  const first=R3_MISSIONS[0];
  const ready=!firstDone&&r3GoldenReady(save);
  const firstItem={...first,status:firstDone?'claimed':ready?'ready':'active',
    progress:[firstDone||ready?1:0],claimed:firstDone,active:!firstDone,ready};
  const second=R3_MISSIONS[1];
  const secondStatus=secondDone?'claimed':!firstDone?'locked':
    !save.r3Campaign?.active||save.r3Campaign.active!==second.id?'available':
    delivered?'ready':'active';
  const secondItem={...second,status:secondStatus,
    progress:[wreckCount,delivered?1:0],claimed:secondDone,
    active:['active','ready'].includes(secondStatus),ready:secondStatus==='ready'};
  const current=firstDone?secondItem:firstItem;
  return {missions:[firstItem,secondItem],essentialClaimed:claimed.filter(id=>R3_MISSIONS.some(m=>m.id===id)).length,
    unlockedRegion:3,activeRegion:3,active:current.active?[current]:[],
    claimable:current.ready?[current]:[],available:current.status==='available'?[current]:[]};
}
export function acceptR3Mission(save,id){
  if(id!=='r3-dark-waters-warning'||!save.r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID)||
    save.r3Campaign?.claimed?.includes(id)||save.r3Campaign?.active===id)return null;
  return {r3Campaign:{...(save.r3Campaign??{}),active:id,wreckDiaries:[],wreckDelivered:false}};
}
export function recordR3Event(save,event){
  if(save.r3Campaign?.active!=='r3-dark-waters-warning')return null;
  const state=save.r3Campaign;
  if(event.type==='wreck-diary'){
    if(!R3_WRECKS.some(w=>w.id===event.id)||state.wreckDiaries?.includes(event.id))return null;
    return {r3Campaign:{...state,wreckDiaries:[...(state.wreckDiaries??[]),event.id]}};
  }
  if(event.type==='return-port'&&(state.wreckDiaries??[]).length===3&&!state.wreckDelivered)
    return {r3Campaign:{...state,wreckDelivered:true}};
  return null;
}
// Claim and legacy-save backfill share one idempotent equipment operation.
// Do not replace launcher ownership or re-equip if the reward was granted before.
export function grantR3HorizonHarpoon(save={}){
  const equipment=save.equipment??{};
  const owned=equipment.ownedHarpoonIds??[];
  if(owned.includes(HORIZON_HARPOON_ID))return null;
  return {
    ...equipment,
    ownedHarpoonIds:[...new Set([...owned,HORIZON_HARPOON_ID])],
    equippedHarpoonId:HORIZON_HARPOON_ID,
  };
}

export function claimR3Mission(save,id){
  if(id===R3_FIRST_MISSION_ID){
    if(!r3GoldenReady(save)||save.r3Campaign?.claimed?.includes(id))return null;
    return {mission:R3_MISSIONS[0],patch:{r3Campaign:{...(save.r3Campaign??{}),
      active:null,claimed:[...new Set([...(save.r3Campaign?.claimed??[]),id])]}}};
  }
  if(id!=='r3-dark-waters-warning'||save.r3Campaign?.active!==id||
    !save.r3Campaign?.wreckDelivered||save.r3Campaign?.claimed?.includes(id))return null;
  const horizonEquipment=grantR3HorizonHarpoon(save);
  return {mission:R3_MISSIONS[1],patch:{
    r3Campaign:{...save.r3Campaign,active:null,claimed:[...new Set([...(save.r3Campaign.claimed??[]),id])]},
    profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+100000},
    ...(horizonEquipment?{equipment:horizonEquipment}:{}),
  }};
}

/**
 * Reward hook for the mission immediately before Varkor.
 * Invoke only when that future mission has been completed.
 * Never invoke from the merchant exchange.
 */
export function awardR3PreVarkorFlame(save={}) {
  if (save.r3Campaign?.varkorFlameUnlocked) return null;
  const consumables=save.consumables??{};
  return {
    r3Campaign:{...(save.r3Campaign??{}),varkorFlameUnlocked:true},
    consumables:{...consumables,quantities:{...(consumables.quantities??{}),
      'flame-5x':Math.max(0,Math.floor(Number(consumables.quantities?.['flame-5x'])||0))+1}},
  };
}
