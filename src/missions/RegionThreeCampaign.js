import { CANNONS, EVENTS, isItemVisible } from '../items/EquipmentCatalog.js';
import { R3_SILAS_MISSION_ID, R3_SILAS_REWARD } from './R3SilasTrade.js';

export const R3_FIRST_MISSION_ID = 'r3-equip-golden';
export const R3_GOLDEN_SHIP_ID = 'galeao-dourado';
export const R3_LEVIATHAN_MISSION_ID = 'r3-leviathan-hunt';
export const R3_LEVIATHAN_ENTITY_ID = 'r3-leviathan';
export const R3_ABYSS_SECRET_MISSION_ID='r3-abyss-secret';
export const R3_ABYSS_WRECKS=Object.freeze([
 Object.freeze({id:'r3-abyss-wreck-1',x:1260,y:2910,name:'Destroços da Maré Perdida'}),
 Object.freeze({id:'r3-abyss-wreck-2',x:3040,y:2400,name:'Destroços do Farol Abissal'}),
 Object.freeze({id:'r3-abyss-wreck-3',x:2860,y:4160,name:'Destroços da Rosa Negra'}),
]);
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
  reward:{gold:100000},
}),Object.freeze({
  id:R3_SILAS_MISSION_ID,
  name:'O Pacto de Silas Rubro',
  description:'Navegue até Silas Rubro, o Mercador do Breu. Resolva a multiplicação e confirme a troca: entregue todo seu estoque de canhões, munições, arpões, lançadores e consumíveis em troca de um arsenal especial. Ouro, rubis, navios e outros itens não fazem parte da negociação.',
  objectives:[{kind:'silas-trade',count:1,label:'Encontrar Silas Rubro e confirmar a troca de todo o arsenal'}],
  reward:{cannons:R3_SILAS_REWARD.cannons,ammo:R3_SILAS_REWARD.ammunition,
    harpoonAmmo:R3_SILAS_REWARD.harpoonAmmo,harpoonLaunchers:R3_SILAS_REWARD.harpoonLaunchers},
}),Object.freeze({
  id:R3_LEVIATHAN_MISSION_ID,
  name:'Caça ao Leviathan',
  description:'Os diários dos destroços falavam de uma criatura colossal. Com o arsenal recebido de Silas Rubro, siga a mão caveirinha até o Leviathan das Águas Escuras. O Fantasma Esmeralda abandona sua patrulha espectral para lutar ao seu lado: 250 de dano a cada 2 segundos. Sobreviva aos mergulhos, derrote a criatura e retorne ao Porto das Missões para revelar uma pista sobre o Coração do Abismo.',
  objectives:[
    {kind:'leviathan-found',count:1,label:'Encontrar o Leviathan nas Águas Escuras'},
    {kind:'leviathan-defeated',count:1,label:'Derrotar o Leviathan'},
    {kind:'return-port',count:1,label:'Voltar ao Porto das Missões após a caçada'},
  ],
  reward:{story:'Uma pista sobre o Coração do Abismo'},
}),Object.freeze({
 id:R3_ABYSS_SECRET_MISSION_ID,name:'O Segredo do Coração do Abismo',
 description:'Afunde cinco corsários Red e recupere três fragmentos dos destroços. Os objetivos são simultâneos; depois entregue o mapa no Porto das Missões.',
 objectives:[{kind:'abyss-red-sinks',count:5,label:'Afundar cinco corsários Red'},
 {kind:'abyss-wrecks',count:3,label:'Recuperar três fragmentos dos destroços'},
 {kind:'return-port',count:1,label:'Entregar o mapa no Porto das Missões'}],
 reward:{gold:100000,story:'Mapa do Coração do Abismo'},
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
  const thirdDone=claimed.includes(R3_SILAS_MISSION_ID);
  const fourthDone=claimed.includes(R3_LEVIATHAN_MISSION_ID);
  const fifthDone=claimed.includes(R3_ABYSS_SECRET_MISSION_ID);
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
  const third=R3_MISSIONS[2];
  const thirdStatus=thirdDone?'claimed':!secondDone?'locked':
    save.r3Campaign?.silasTradeCompleted?'ready':
    save.r3Campaign?.active===third.id?'active':'available';
  const thirdItem={...third,status:thirdStatus,
    progress:[save.r3Campaign?.silasTradeCompleted||thirdDone?1:0],
    claimed:thirdDone,active:['active','ready'].includes(thirdStatus),
    ready:thirdStatus==='ready'};
  const fourth=R3_MISSIONS[3];
  const fourthActive=save.r3Campaign?.active===R3_LEVIATHAN_MISSION_ID;
  const fourthReady=fourthActive && !!save.r3Campaign?.leviathanFound
    && !!save.r3Campaign?.leviathanDefeated && !!save.r3Campaign?.leviathanReturned;
  const fourthStatus=fourthDone?'claimed':!thirdDone?'locked':
    fourthReady?'ready':fourthActive?'active':'available';
  const fourthItem={...fourth,status:fourthStatus,
    progress:[
      save.r3Campaign?.leviathanFound||fourthDone?1:0,
      save.r3Campaign?.leviathanDefeated||fourthDone?1:0,
      save.r3Campaign?.leviathanReturned||fourthDone?1:0,
    ],claimed:fourthDone,active:['active','ready'].includes(fourthStatus),ready:fourthStatus==='ready'};
  const fifth=R3_MISSIONS[4];
  const fifthActive=save.r3Campaign?.active===R3_ABYSS_SECRET_MISSION_ID;
  const redCount=Math.min(5,Math.max(0,Number(save.r3Campaign?.abyssRedSinks)||0));
  const fragmentCount=Math.min(3,(save.r3Campaign?.abyssFragments??[]).length);
  const fifthReady=fifthActive&&redCount===5&&fragmentCount===3&&!!save.r3Campaign?.abyssReturned;
  const fifthStatus=fifthDone?'claimed':!fourthDone?'locked':fifthReady?'ready':fifthActive?'active':'available';
  const fifthItem={...fifth,status:fifthStatus,progress:[redCount,fragmentCount,save.r3Campaign?.abyssReturned||fifthDone?1:0],claimed:fifthDone,active:['active','ready'].includes(fifthStatus),ready:fifthStatus==='ready'};
  const current=firstDone?(secondDone?(thirdDone?(fourthDone?fifthItem:fourthItem):thirdItem):secondItem):firstItem;
  return {missions:[firstItem,secondItem,thirdItem,fourthItem,fifthItem],
    essentialClaimed:claimed.filter(id=>R3_MISSIONS.some(m=>m.id===id)).length,
    unlockedRegion:3,activeRegion:3,
    active:current.active?[current]:[],claimable:current.ready?[current]:[],
    available:current.status==='available'?[current]:[]};
}
export function acceptR3Mission(save,id){
 if(id===R3_ABYSS_SECRET_MISSION_ID){
  if(!save.r3Campaign?.claimed?.includes(R3_LEVIATHAN_MISSION_ID)||save.r3Campaign.claimed.includes(id)||save.r3Campaign.active===id)return null;
  return {r3Campaign:{...save.r3Campaign,active:id,abyssRedSinks:0,abyssRedSinkIds:[],abyssFragments:[],abyssReturned:false}};
 }
  if(id===R3_LEVIATHAN_MISSION_ID){
    if(!save.r3Campaign?.claimed?.includes(R3_SILAS_MISSION_ID)
      ||save.r3Campaign?.claimed?.includes(id)||save.r3Campaign?.active===id)return null;
    return {r3Campaign:{...(save.r3Campaign??{}),active:id,
      leviathanFound:false,leviathanDefeated:false,leviathanReturned:false}};
  }
  if(id===R3_SILAS_MISSION_ID){
    if(!save.r3Campaign?.claimed?.includes('r3-dark-waters-warning')
      ||save.r3Campaign?.claimed?.includes(id)||save.r3Campaign?.active===id)return null;
    return {r3Campaign:{...(save.r3Campaign??{}),active:id}};
  }
  if(id!=='r3-dark-waters-warning'||!save.r3Campaign?.claimed?.includes(R3_FIRST_MISSION_ID)||
    save.r3Campaign?.claimed?.includes(id)||save.r3Campaign?.active===id)return null;
  return {r3Campaign:{...(save.r3Campaign??{}),active:id,wreckDiaries:[],wreckDelivered:false}};
}
export function recordR3Event(save,event){
 if(save.r3Campaign?.active===R3_ABYSS_SECRET_MISSION_ID){
  const state=save.r3Campaign;
  if(event.type==='abyss-red-sunk'&&event.archetype==='terror-guardian'&&event.id&&(Number(state.abyssRedSinks)||0)<5){
   if((state.abyssRedSinkIds??[]).includes(event.id))return null;
   return {r3Campaign:{...state,abyssRedSinks:(Number(state.abyssRedSinks)||0)+1,abyssRedSinkIds:[...(state.abyssRedSinkIds??[]),event.id]}};
  }
  if(event.type==='abyss-fragment'&&R3_ABYSS_WRECKS.some(w=>w.id===event.id)&&!(state.abyssFragments??[]).includes(event.id))
   return {r3Campaign:{...state,abyssFragments:[...(state.abyssFragments??[]),event.id]}};
  if(event.type==='return-port'&&(Number(state.abyssRedSinks)||0)>=5&&(state.abyssFragments??[]).length===3&&!state.abyssReturned)
   return {r3Campaign:{...state,abyssReturned:true}};
  return null;
 }
  if(save.r3Campaign?.active===R3_LEVIATHAN_MISSION_ID){
    const state=save.r3Campaign;
    if(event.type==='leviathan-found'&&event.id===R3_LEVIATHAN_ENTITY_ID&&!state.leviathanFound)
      return {r3Campaign:{...state,leviathanFound:true}};
    if(event.type==='leviathan-defeated'&&event.id===R3_LEVIATHAN_ENTITY_ID
      &&state.leviathanFound&&!state.leviathanDefeated)
      return {r3Campaign:{...state,leviathanDefeated:true}};
    if(event.type==='return-port'&&state.leviathanDefeated&&!state.leviathanReturned)
      return {r3Campaign:{...state,leviathanReturned:true}};
    return null;
  }
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
export function claimR3Mission(save,id){
 if(id===R3_ABYSS_SECRET_MISSION_ID){
  const state=save.r3Campaign??{};
  if(state.active!==id||!state.claimed?.includes(R3_LEVIATHAN_MISSION_ID)||(Number(state.abyssRedSinks)||0)<5||(state.abyssFragments??[]).length!==3||!state.abyssReturned||state.claimed.includes(id))return null;
  return {mission:R3_MISSIONS[4],patch:{r3Campaign:{...state,active:null,claimed:[...new Set([...state.claimed,id])],abyssHeartMap:true},profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+100000}}};
 }
  if(id===R3_LEVIATHAN_MISSION_ID){
    if(save.r3Campaign?.active!==id
      ||!save.r3Campaign?.claimed?.includes(R3_SILAS_MISSION_ID)
      ||!save.r3Campaign?.leviathanFound||!save.r3Campaign?.leviathanDefeated
      ||!save.r3Campaign?.leviathanReturned
      ||save.r3Campaign?.claimed?.includes(id))return null;
    return {mission:R3_MISSIONS[3],patch:{r3Campaign:{...save.r3Campaign,
      active:null,claimed:[...new Set([...(save.r3Campaign.claimed??[]),id])]}}};
  }
  if(id===R3_FIRST_MISSION_ID){
    if(!r3GoldenReady(save)||save.r3Campaign?.claimed?.includes(id))return null;
    return {mission:R3_MISSIONS[0],patch:{r3Campaign:{...(save.r3Campaign??{}),
      active:null,claimed:[...new Set([...(save.r3Campaign?.claimed??[]),id])]}}};
  }
  if(id===R3_SILAS_MISSION_ID){
    if(!save.r3Campaign?.silasTradeCompleted
      ||save.r3Campaign?.claimed?.includes(id))return null;
    return {mission:R3_MISSIONS[2],patch:{
      r3Campaign:{...save.r3Campaign,active:null,
        claimed:[...new Set([...(save.r3Campaign.claimed??[]),id])]},
    }};
  }
  if(id!=='r3-dark-waters-warning'||save.r3Campaign?.active!==id||
    !save.r3Campaign?.wreckDelivered||save.r3Campaign?.claimed?.includes(id))return null;
  return {mission:R3_MISSIONS[1],patch:{
    r3Campaign:{...save.r3Campaign,active:null,claimed:[...new Set([...(save.r3Campaign.claimed??[]),id])]},
    profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+100000},
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
