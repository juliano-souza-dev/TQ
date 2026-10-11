import { TERROR_ABYSS_HARPOON_ID, HORIZON_HARPOON_AMMO_ID } from '../combat/HarpoonCatalog.js';
import { CANNONS, EVENTS, isItemVisible } from '../items/EquipmentCatalog.js';
import { R3_SILAS_MISSION_ID, R3_SILAS_REWARD } from './R3SilasTrade.js';

export const R3_FIRST_MISSION_ID = 'r3-equip-golden';
export const R3_GOLDEN_SHIP_ID = 'galeao-dourado';
export const R3_LEVIATHAN_MISSION_ID = 'r3-leviathan-hunt';
export const R3_LEVIATHAN_ENTITY_ID = 'r3-leviathan';
export const R3_ABYSS_SECRET_MISSION_ID='r3-abyss-secret';
export const R3_FLAME_MISSION_ID='r3-abyss-flame';
export const R3_VARKOR_MISSION_ID='r3-terror-awakening';
export const R3_REBUILD_MISSION_ID='r3-rebuild-terror';
export const R3_CLEANUP_MISSION_ID='r3-clean-waters';
export const R3_CLEANUP_RED_IDS=Object.freeze(['r3-dente-do-pavor','r3-red-marea','r3-red-coral']);
export const R3_FLAME_STOPS=Object.freeze([
  Object.freeze({id:'r3-flame-wreck-1',x:850,y:2480,name:'Destroços Perdidos',questions:2}),
  Object.freeze({id:'r3-flame-wreck-2',x:1820,y:3020,name:'Fragmentos da Chama I',questions:1}),
  Object.freeze({id:'r3-flame-wreck-3',x:2740,y:2850,name:'Fragmentos da Chama II',questions:1}),
  Object.freeze({id:'r3-flame-wreck-4',x:1850,y:4360,name:'A Chama Desperta',questions:3}),
]);
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
  reward:{gold:10000},
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
  reward:{gold:25000,harpoonAmmo:{'harpoon-horizon-incendiary':200},ammo:{'aetherion-seeker':200},story:'Uma pista sobre o Coração do Abismo'},
}),Object.freeze({
 id:R3_ABYSS_SECRET_MISSION_ID,name:'O Segredo do Coração do Abismo',
 description:'Afunde cinco corsários Red e recupere três fragmentos dos destroços. Os objetivos são simultâneos; depois entregue o mapa no Porto das Missões.',
 objectives:[{kind:'abyss-red-sinks',count:5,label:'Afundar cinco corsários Red'},
 {kind:'abyss-wrecks',count:3,label:'Recuperar três fragmentos dos destroços'},
 {kind:'return-port',count:1,label:'Entregar o mapa no Porto das Missões'}],
 reward:{gold:15000,ammo:{'aetherion-seeker':250},story:'Mapa do Coração do Abismo'},
}),Object.freeze({
 id:R3_FLAME_MISSION_ID,name:'A Chama do Abismo',
 description:'Siga os pontos do mapa em ordem, recupere quatro destroços resolvendo sete multiplicações, derrote dois corsários Red durante a expedição e retorne ao Porto das Missões.',
 objectives:[{kind:'flame-wrecks',count:4,label:'Explorar quatro pontos de destroços em ordem'},
 {kind:'flame-math',count:7,label:'Resolver sete multiplicações'},
 {kind:'flame-enemies',count:2,label:'Derrotar dois corsários Red'},
 {kind:'return-port',count:1,label:'Retornar ao Porto das Missões'}],
 reward:{consumables:{'flame-5x':1}},
}),Object.freeze({
 id:R3_VARKOR_MISSION_ID,
 name:'O Despertar do Terror do Mar',
 description:'A Chama do Abismo rompeu o selo do oceano. A frota foge, mas o Ladrão Sombra continua à espreita. O Fantasma Esmeralda regressa para enfrentar o Capitão Varkor Tenebris. Navegue até o Terror do Mar, sobreviva ao confronto e retorne ao Porto das Missões para contar a vitória.',
 objectives:[{kind:'varkor-summon',count:1,label:'Convocar o Terror do Mar'},
 {kind:'varkor-defeat',count:1,label:'Derrotar o Terror do Mar'},
 {kind:'varkor-wreck',count:4,label:'Resolver quatro multiplicações nos destroços do Terror do Mar'},
 {kind:'return-port',count:1,label:'Retornar ao Porto das Missões'}],
 reward:{gold:25000},
}),Object.freeze({
 id:R3_REBUILD_MISSION_ID,name:'O Renascimento do Terror do Mar',
 description:'De volta ao porto, uma mensagem do Fantasma Esmeralda revela que o projeto recuperado guarda um segredo. Encontre o navio verde perto da Ilha Esquecida, resolva a multiplicação, recolha os destroços que ele precisa e visite o Estaleiro para reconstruir e equipar o Terror do Mar. Só então a próxima região será liberada.',
 objectives:[{kind:'emerald-talk',count:1,label:'Encontrar o Fantasma Esmeralda perto da Ilha Esquecida'},
 {kind:'emerald-wreck',count:1,label:'Recolher os destroços para a construção'},
 {kind:'terror-equip',count:1,label:'Construir e equipar o Terror do Mar no Estaleiro'}],
 reward:{story:'O Terror do Mar foi reconstruído'},
}),Object.freeze({
 id:R3_CLEANUP_MISSION_ID,name:'Os Últimos Resíduos',
 description:'As águas foram limpas, mas três navios Red ainda rondam a região. Afunde os remanescentes; o Fantasma Esmeralda já partiu e a Sombra do Saque foge para Terras Gélidas. Retorne ao Porto das Missões antes da travessia.',
 objectives:[{kind:'cleanup-red',count:3,label:'Afundar os três Red remanescentes'},{kind:'return-port',count:1,label:'Retornar ao Porto das Missões'}],
 reward:{gold:15000,unlockRegion:4},
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
  const sixthDone=claimed.includes(R3_FLAME_MISSION_ID);
  const seventhDone=claimed.includes(R3_VARKOR_MISSION_ID);
  const eighthDone=claimed.includes(R3_REBUILD_MISSION_ID);
  const ninthDone=claimed.includes(R3_CLEANUP_MISSION_ID);
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
  const sixth=R3_MISSIONS[5];
  const flame=save.r3Campaign??{};
  const flameReady=flame.active===R3_FLAME_MISSION_ID&&flame.flameStep===6&&flame.flameReturned;
  const sixthStatus=sixthDone?'claimed':!fifthDone?'locked':flameReady?'ready':flame.active===R3_FLAME_MISSION_ID?'active':'available';
  const sixthItem={...sixth,status:sixthStatus,progress:[Math.min(4,flame.flameWrecks??0),Math.min(7,flame.flameMath??0),Math.min(2,flame.flameKills??0),flame.flameReturned?1:0],claimed:sixthDone,active:['active','ready'].includes(sixthStatus),ready:sixthStatus==='ready'};
  const seventh=R3_MISSIONS[6];
  const varkor=save.r3Campaign??{};
  const seventhActive=varkor.active===R3_VARKOR_MISSION_ID;
  const seventhReady=seventhActive&&varkor.varkorSummoned&&varkor.varkorDefeated&&varkor.varkorWreckClaimed&&varkor.varkorReturned;
  const seventhStatus=seventhDone?'claimed':!sixthDone?'locked':seventhReady?'ready':seventhActive?'active':'available';
  const seventhItem={...seventh,status:seventhStatus,progress:[varkor.varkorSummoned||seventhDone?1:0,varkor.varkorDefeated||seventhDone?1:0,Math.min(4,varkor.varkorWreckAnswers??0),varkor.varkorReturned||seventhDone?1:0],claimed:seventhDone,active:['active','ready'].includes(seventhStatus),ready:seventhStatus==='ready'};
  const eighth=R3_MISSIONS[7],rebuild=save.r3Campaign??{};
  const eighthActive=rebuild.active===R3_REBUILD_MISSION_ID;
  const eighthReady=eighthActive&&rebuild.emeraldWreckCollected&&save.equipment?.equippedShipId==='terror-do-mar';
  const eighthStatus=eighthDone?'claimed':!seventhDone?'locked':eighthReady?'ready':eighthActive?'active':'available';
  const eighthItem={...eighth,status:eighthStatus,progress:[rebuild.emeraldSpoken||eighthDone?1:0,rebuild.emeraldWreckCollected||eighthDone?1:0,save.equipment?.equippedShipId==='terror-do-mar'||eighthDone?1:0],claimed:eighthDone,active:['active','ready'].includes(eighthStatus),ready:eighthStatus==='ready'};
  const cleanup=save.r3Campaign??{},kills=R3_CLEANUP_RED_IDS.filter(id=>(cleanup.cleanupSunkIds??[]).includes(id)).length;
  const ninthActive=cleanup.active===R3_CLEANUP_MISSION_ID;
  const ninthReady=ninthActive&&kills===3&&!!cleanup.cleanupReturned;
  const ninthStatus=ninthDone?'claimed':!eighthDone?'locked':ninthReady?'ready':ninthActive?'active':'available';
  const ninthItem={...R3_MISSIONS[8],status:ninthStatus,progress:[kills,cleanup.cleanupReturned||ninthDone?1:0],claimed:ninthDone,active:['active','ready'].includes(ninthStatus),ready:ninthStatus==='ready'};
  const current=eighthDone?ninthItem:seventhDone?eighthItem:sixthDone?seventhItem:fifthDone?sixthItem:firstDone?(secondDone?(thirdDone?(fourthDone?fifthItem:fourthItem):thirdItem):secondItem):firstItem;
  return {missions:[firstItem,secondItem,thirdItem,fourthItem,fifthItem,sixthItem,seventhItem,eighthItem,ninthItem],
    essentialClaimed:claimed.filter(id=>R3_MISSIONS.some(m=>m.id===id)).length,
    unlockedRegion:Math.max(3,Number(save.progression?.unlockedRegion)||3),activeRegion:3,
    active:current.active?[current]:[],claimable:current.ready?[current]:[],
    available:current.status==='available'?[current]:[]};
}
// Reinicia somente o Renascimento, preservando conquistas anteriores e sem liberar o mapa 4.
export function resetR3RebuildMission(save = {}) {
  const state = save.r3Campaign ?? {};
  if (!state.claimed?.includes(R3_VARKOR_MISSION_ID) ||
      (Number(save.progression?.unlockedRegion) || 1) >= 4) return null;
  return { r3Campaign: {
    ...state,
    active: R3_REBUILD_MISSION_ID,
    claimed: (state.claimed ?? []).filter(id => id !== R3_REBUILD_MISSION_ID && id !== R3_CLEANUP_MISSION_ID),
    emeraldSpoken: false,
    emeraldWreckCollected: false,
    emeraldDeparted: false,
    cleanupSunkIds: [],
    cleanupReturned: false,
  }};
}

export function acceptR3Mission(save,id){
 if(id===R3_CLEANUP_MISSION_ID){const state=save.r3Campaign??{};
  if(!state.claimed?.includes(R3_REBUILD_MISSION_ID)||state.claimed.includes(id)||state.active)return null;
  const equipment=save.equipment??{};
  const counts={...(equipment.cannonCounts??{})};
  counts['pumpkin-terror']=(Number(counts['pumpkin-terror'])||0)+5;
  counts['aetherion-mk1']=(Number(counts['aetherion-mk1'])||0)+2;
  const shipId='terror-do-mar';
  const capacity=7+(save.shipUpgrades?.masterShipwright?5:0);
  const loadout={...(equipment.loadout??{})};
  const slots=Array.isArray(loadout[shipId])?[...loadout[shipId]].slice(0,capacity):[];
  const alreadyEquipped=(id)=>slots.filter(x=>x===id).length;
  const previousCounts=equipment.cannonCounts??{};
  for(const [id,grant] of [['aetherion-mk1',2],['pumpkin-terror',5]]){
    // Only allocate the newly granted stock, keeping the existing loadout.
    const originalStock=Math.max(0,Number(previousCounts[id])||0);
    const freeFromGrant=Math.max(0,originalStock+grant-alreadyEquipped(id));
    for(let n=0;n<Math.min(grant,freeFromGrant);n++){
      let slot=slots.findIndex(x=>!x);
      if(slot<0)slot=slots.length<capacity?slots.length:-1;
      if(slot<0)break;
      slots[slot]=id;
    }
  }
  loadout[shipId]=slots;
  const ammo=save.ammunition??{};
  return {ammunition:{...ammo,'aetherion-seeker':(Number(ammo['aetherion-seeker'])||0)+10000,
      'rusted-iron':(Number(ammo['rusted-iron'])||0)+2000},
    r3Campaign:{...state,active:id,cleanupSunkIds:[],cleanupReturned:false,emeraldDeparted:true},
    equipment:{...equipment,cannonCounts:counts,
      ownedCannonIds:[...new Set([...(equipment.ownedCannonIds??[]),'pumpkin-terror','aetherion-mk1'])],
      loadout}};
 }
 if(id===R3_REBUILD_MISSION_ID){
  const state=save.r3Campaign??{};
  if(!state.claimed?.includes(R3_VARKOR_MISSION_ID)||state.claimed.includes(id)||state.active)return null;
  return {r3Campaign:{...state,active:id,emeraldSpoken:false,emeraldWreckCollected:false}};
 }
 if(id===R3_VARKOR_MISSION_ID){
  const state=save.r3Campaign??{};
  if(!state.claimed?.includes(R3_FLAME_MISSION_ID)||state.claimed.includes(id)||state.active)return null;
  return {r3Campaign:{...state,active:id,varkorSummoned:false,varkorDefeated:false,varkorWreckAnswers:0,varkorWreckClaimed:false,varkorWreckPosition:null,varkorReturned:false}};
 }
 if(id===R3_FLAME_MISSION_ID){
  if(!save.r3Campaign?.claimed?.includes(R3_ABYSS_SECRET_MISSION_ID)||save.r3Campaign.claimed.includes(id)||save.r3Campaign.active)return null;
  return {r3Campaign:{...save.r3Campaign,active:id,flameStep:0,flameWrecks:0,flameMath:0,flameKills:0,flameKillIds:[],flameReturned:false}};
 }
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
 if(save.r3Campaign?.active===R3_CLEANUP_MISSION_ID){const state=save.r3Campaign;
  if(event.type==='cleanup-red-sunk'&&R3_CLEANUP_RED_IDS.includes(event.id)&&!(state.cleanupSunkIds??[]).includes(event.id))return {r3Campaign:{...state,cleanupSunkIds:[...(state.cleanupSunkIds??[]),event.id]}};
  if(event.type==='return-port'&&R3_CLEANUP_RED_IDS.every(id=>(state.cleanupSunkIds??[]).includes(id))&&!state.cleanupReturned)return {r3Campaign:{...state,cleanupReturned:true}};
  return null;
 }
 if(save.r3Campaign?.active===R3_REBUILD_MISSION_ID){
  const state=save.r3Campaign;
  if(event.type==='emerald-talk'&&!state.emeraldSpoken)return {r3Campaign:{...state,emeraldSpoken:true}};
  if(event.type==='emerald-wreck'&&state.emeraldSpoken&&!state.emeraldWreckCollected)return {r3Campaign:{...state,emeraldWreckCollected:true}};
  return null;
 }
 if(save.r3Campaign?.active===R3_VARKOR_MISSION_ID){
  const state=save.r3Campaign;
  if(event.type==='varkor-summon'&&!state.varkorSummoned)return {r3Campaign:{...state,varkorSummoned:true}};
  if(event.type==='defeat'&&event.archetype==='terror-do-mar'&&state.varkorSummoned&&!state.varkorDefeated)return {r3Campaign:{...state,varkorDefeated:true,varkorWreckPosition:{x:Number(event.x)||0,y:Number(event.y)||0}}};
  if(event.type==='varkor-wreck-math'&&state.varkorDefeated&&!state.varkorWreckClaimed){
    const count=Math.min(4,(state.varkorWreckAnswers??0)+1);
    return {r3Campaign:{...state,varkorWreckAnswers:count,varkorWreckClaimed:count===4}};
  }
  if(event.type==='return-port'&&state.varkorWreckClaimed&&!state.varkorReturned)return {r3Campaign:{...state,varkorReturned:true}};
  return null;
 }
 if(save.r3Campaign?.active===R3_FLAME_MISSION_ID){
  const state=save.r3Campaign,step=state.flameStep??0;
  if(event.type==='flame-math'&&step<6&&step%3!==1){
   const index=step===0?0:step===2?1:step===3?2:3;
   const wreck=R3_FLAME_STOPS[index];
   if(event.id!==wreck.id)return null;
   const count=(state.flameMathAtStop??0)+1;
   const done=count>=wreck.questions;
   return {r3Campaign:{...state,flameMath:(state.flameMath??0)+1,flameMathAtStop:done?0:count,
     flameWrecks:(state.flameWrecks??0)+(done?1:0),flameStep:done?step+1:step}};
  }
  if(event.type==='flame-enemy'&&(step===1||step===4)&&event.archetype==='terror-guardian'&&event.id&&!(state.flameKillIds??[]).includes(event.id))
   return {r3Campaign:{...state,flameKills:(state.flameKills??0)+1,flameKillIds:[...(state.flameKillIds??[]),event.id],flameStep:step+1}};
  if(event.type==='return-port'&&step===6&&!state.flameReturned)
   return {r3Campaign:{...state,flameReturned:true}};
  return null;
 }

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
 if(id===R3_CLEANUP_MISSION_ID){const state=save.r3Campaign??{};
  if(state.active!==id||state.claimed?.includes(id)||!state.cleanupReturned||!R3_CLEANUP_RED_IDS.every(id=>(state.cleanupSunkIds??[]).includes(id)))return null;
  return {mission:R3_MISSIONS[8],patch:{r3Campaign:{...state,active:null,claimed:[...new Set([...(state.claimed??[]),id])]},profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+15000},progression:{...(save.progression??{}),unlockedRegion:Math.max(4,Number(save.progression?.unlockedRegion)||1)}}};
 }
 if(id===R3_REBUILD_MISSION_ID){
  const state=save.r3Campaign??{};
  if(state.active!==id||!state.emeraldWreckCollected||save.equipment?.equippedShipId!=='terror-do-mar'||state.claimed?.includes(id))return null;
  return {mission:R3_MISSIONS[7],patch:{r3Campaign:{...state,active:null,claimed:[...new Set([...(state.claimed??[]),id])]}}};
 }
 if(id===R3_VARKOR_MISSION_ID){
  const state=save.r3Campaign??{};
  if(state.active!==id||!state.varkorSummoned||!state.varkorDefeated||!state.varkorWreckClaimed||!state.varkorReturned||state.claimed?.includes(id))return null;
  return {mission:R3_MISSIONS[6],patch:{r3Campaign:{...state,active:null,claimed:[...new Set([...(state.claimed??[]),id])]},profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+25000}}};
 }
 if(id===R3_FLAME_MISSION_ID){
  const state=save.r3Campaign??{};
  if(state.active!==id||state.flameStep!==6||!state.flameReturned||state.claimed?.includes(id))return null;
  const reward=awardR3PreVarkorFlame(save);
  return {mission:R3_MISSIONS[5],patch:{...reward,r3Campaign:{...reward.r3Campaign,active:null,claimed:[...new Set([...(state.claimed??[]),id])]}}};
 }

 if(id===R3_ABYSS_SECRET_MISSION_ID){
  const state=save.r3Campaign??{};
  if(state.active!==id||!state.claimed?.includes(R3_LEVIATHAN_MISSION_ID)||(Number(state.abyssRedSinks)||0)<5||(state.abyssFragments??[]).length!==3||!state.abyssReturned||state.claimed.includes(id))return null;
  return {mission:R3_MISSIONS[4],patch:{r3Campaign:{...state,active:null,claimed:[...new Set([...state.claimed,id])],abyssHeartMap:true},profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+15000},ammunition:{...(save.ammunition??{}),'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+250}}};
 }
  if(id===R3_LEVIATHAN_MISSION_ID){
    if(save.r3Campaign?.active!==id
      ||!save.r3Campaign?.claimed?.includes(R3_SILAS_MISSION_ID)
      ||!save.r3Campaign?.leviathanFound||!save.r3Campaign?.leviathanDefeated
      ||!save.r3Campaign?.leviathanReturned
      ||save.r3Campaign?.claimed?.includes(id))return null;
    return {mission:R3_MISSIONS[3],patch:{r3Campaign:{...save.r3Campaign,
      active:null,claimed:[...new Set([...(save.r3Campaign.claimed??[]),id])]},
      profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+25000},
      ammunition:{...(save.ammunition??{}),'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+200},
      harpoonAmmo:{...(save.harpoonAmmo??{}),'harpoon-horizon-incendiary':(Number(save.harpoonAmmo?.['harpoon-horizon-incendiary'])||0)+200}}};
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
    profile:{...(save.profile??{}),gold:(Number(save.profile?.gold)||0)+10000},
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
