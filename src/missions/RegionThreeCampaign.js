import { CANNONS, EVENTS, isItemVisible } from '../items/EquipmentCatalog.js';

export const R3_FIRST_MISSION_ID = 'r3-equip-golden';
export const R3_GOLDEN_SHIP_ID = 'galeao-dourado';
export const R3_MISSIONS = Object.freeze([Object.freeze({
  id: R3_FIRST_MISSION_ID,
  name: 'Preparar o Galeão Dourado',
  description: 'Prepare o Galeão Dourado para as Águas Escuras. Se já estiver equipado com a melhor artilharia disponível, a missão será concluída automaticamente. Caso contrário, vá ao Estaleiro para receber a equipagem automática.',
  objectives: [{kind:'r3-outfit',count:1,label:'Equipar o Galeão Dourado e a melhor artilharia disponível'}],
  reward: {},
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

export function getR3Board(save={}) {
  const mission = R3_MISSIONS[0];
  const claimed = !!save.r3Campaign?.claimed?.includes(mission.id);
  const ready = !claimed && r3GoldenReady(save);
  const status = claimed ? 'claimed' : ready ? 'ready' : 'active';
  const current = {...mission,status,progress:[ready||claimed?1:0],claimed,
    active:!claimed,ready};
  return {missions:[current],essentialClaimed:claimed?1:0,unlockedRegion:3,activeRegion:3,
    active:claimed?[]:[current],claimable:ready?[current]:[],available:[]};
}
export function acceptR3Mission(){return null;}
export function recordR3Event(){return null;}
export function claimR3Mission(save,id){
  if(id!==R3_FIRST_MISSION_ID||!r3GoldenReady(save)||
    save.r3Campaign?.claimed?.includes(id))return null;
  return {mission:R3_MISSIONS[0],patch:{r3Campaign:{...(save.r3Campaign??{}),
    active:null,claimed:[...new Set([...(save.r3Campaign?.claimed??[]),id])]}}};
}
