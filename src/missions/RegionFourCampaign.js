export const R4_MISSIONS=Object.freeze([
 {id:'r4-ice-wreck-investigation',name:'Coletando Destroços',description:'Investigue os destroços das Terras Gélidas e retorne ao Porto das Missões. Mais detalhes da história serão adicionados.',objectives:[{kind:'wreck',count:5,label:'Investigar os 5 destroços gélidos'},{kind:'return-port',count:1,label:'Retornar ao porto'}],reward:{consumables:{'area-freeze':5}}},
 {id:'r4-building-strength',name:'Construindo Força',description:'Encontre o Mercador Red e compre o pacote Terror Gélido.',objectives:[{kind:'trade',count:1,label:'Comprar o pacote Terror Gélido'},{kind:'return-port',count:1,label:'Retornar ao porto'}],reward:{}},
 {id:'r4-equip-ice-terror',name:'Armamento Gélido',description:'Vá ao Estaleiro e instale todos os 12 novos canhões Terror Gélido.',objectives:[{kind:'equip',count:12,label:'Equipar os 12 canhões Terror Gélido'},{kind:'return-port',count:1,label:'Retornar ao porto'}],reward:{}},
 {id:'r4-frost-watch',name:'Patrulha da Geada',description:'Afunde dois Vigias da Geada e retorne ao porto.',objectives:[{kind:'defeat',count:2,label:'Afundar dois Vigias da Geada'},{kind:'return-port',count:1,label:'Retornar ao porto'}],reward:{ammo:{'frozen-explosion':300}}},
 {id:'r4-shadow-trail',name:'O Rastro do Sombra',description:'Derrote o Sombra do Saque e retorne ao porto.',objectives:[{kind:'defeat',count:1,label:'Derrotar Sombra do Saque'},{kind:'return-port',count:1,label:'Retornar ao porto'}],reward:{ammo:{'frozen-explosion':500}}}
]);
// Reconcile wrecks gathered before the mission was accepted without resetting collection.
const R4_WRECK_IDS=new Set(['r4-ice-wreck-1','r4-ice-wreck-2','r4-ice-wreck-3','r4-ice-wreck-4','r4-ice-wreck-5']);
export const R4_ICE_TERROR_PACKAGE_SIZE=12;
export const r4EquippedIceCannons=save=>Math.max(0,...Object.values(save.equipment?.loadout??{}).map(slots=>(slots??[]).filter(id=>id==='ice-terror').length));
const collectedWrecks=save=>[...new Set([
  ...(save.r4CollectedWrecks??[]),...(save.r4Campaign?.wrecks??[])
].filter(id=>R4_WRECK_IDS.has(id)))];
export function getR4Board(save={}){
 const state=save.r4Campaign??{},claimed=state.claimed??[];
 const missions=R4_MISSIONS.map((m,i)=>{
  const done=claimed.includes(m.id),locked=i>0&&!claimed.includes(R4_MISSIONS[i-1].id);
  const active=state.active===m.id,defeats=active?Math.min(m.objectives[0].count,m.id==='r4-ice-wreck-investigation'?collectedWrecks(save).length:m.id==='r4-building-strength'?(state.packagePurchased?1:0):m.id==='r4-equip-ice-terror'?r4EquippedIceCannons(save):state.defeats??0):0;
  const ready=active&&defeats>=m.objectives[0].count&&!!state.returned;
  const status=done?'claimed':locked?'locked':ready?'ready':active?'active':'available';
  return {...m,status,progress:[done?m.objectives[0].count:defeats,done||active&&state.returned?1:0],claimed:done,active:status==='active'||status==='ready',ready:status==='ready'};
 });
 return {missions,essentialClaimed:missions.filter(m=>m.claimed).length,activeRegion:4,unlockedRegion:Math.max(4,Number(save.progression?.unlockedRegion)||4),active:missions.filter(m=>m.active),claimable:missions.filter(m=>m.ready),available:missions.filter(m=>m.status==='available')};
}
export function acceptR4Mission(save,id){
 if(save.r4Campaign?.active||!getR4Board(save).available.some(m=>m.id===id))return null;
 return {r4Campaign:{...(save.r4Campaign??{}),active:id,defeats:0,wrecks:id==='r4-ice-wreck-investigation'?collectedWrecks(save):[],returned:false,defeatIds:[]}};
}
export function recordR4Event(save,event){
 const state=save.r4Campaign??{},id=state.active;
 if(!id)return null;
 if(id==='r4-ice-wreck-investigation'&&event.type==='r4-wreck'&&R4_WRECK_IDS.has(event.id)&&!collectedWrecks(save).includes(event.id))return {r4Campaign:{...state,wrecks:[...collectedWrecks(save),event.id]}};
 if(id==='r4-building-strength'&&event.type==='r4-package-purchased'&&!state.packagePurchased)return {r4Campaign:{...state,packagePurchased:true}};
 const match=id==='r4-frost-watch'?event.archetype==='vigia-da-geada':event.id==='r4-sombra-do-saque';
 const required=id==='r4-ice-wreck-investigation'?5:id==='r4-equip-ice-terror'?12:id==='r4-frost-watch'?2:1;
 if(event.type==='defeat'&&match&&(state.defeats??0)<required && (!event.defeatId || !(state.defeatIds??[]).includes(event.defeatId)))
  return {r4Campaign:{...state,defeats:(state.defeats??0)+1,defeatIds:event.defeatId?[...(state.defeatIds??[]),event.defeatId]:(state.defeatIds??[])}};
 if(event.type==='return-port'&&(id==='r4-ice-wreck-investigation'?collectedWrecks(save).length:id==='r4-building-strength'?(state.packagePurchased?1:0):id==='r4-equip-ice-terror'?r4EquippedIceCannons(save):(state.defeats??0))>=required&&!state.returned)
  return {r4Campaign:{...state,returned:true}};
 return null;
}
export function claimR4Mission(save,id){
 const mission=getR4Board(save).claimable.find(m=>m.id===id);
 if(!mission)return null;
 const amount=mission.reward.ammo?.['frozen-explosion']??0;
 const areaFreeze=mission.reward.consumables?.['area-freeze']??0;
 const c=save.consumables??{};
 return {mission,patch:{r4Campaign:{...save.r4Campaign,active:null,defeats:0,wrecks:collectedWrecks(save),defeatIds:[],returned:false,claimed:[...new Set([...(save.r4Campaign?.claimed??[]),id])]},ammunition:{...(save.ammunition??{}),'frozen-explosion':(Number(save.ammunition?.['frozen-explosion'])||0)+amount},consumables:{...c,quantities:{...(c.quantities??{}),'area-freeze':(Number(c.quantities?.['area-freeze'])||0)+areaFreeze}}}};
}
