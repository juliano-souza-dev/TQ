import { canonicalSingleMissionState, missionStatus, activeBoardMissions, uniqueClaimedCount } from './CampaignState.js';

export const R3_MISSIONS=Object.freeze([
  Object.freeze({
    id:'r3-equip-golden',name:'Preparar a Jornada Sombria',
    description:'O Galeão Dourado recebido na Região 2 deve liderar a travessia. Vá ao Estaleiro: o mestre equipará automaticamente o navio, dois Canhões Aetherion MK-I e os melhores canhões restantes que você possui.',
    objectives:[{kind:'r3-outfit',count:1,label:'Atracar no Estaleiro e preparar a Galeão Dourado'}],
    reward:{gold:300},
  }),
]);
const stateOf=save=>canonicalSingleMissionState(save.r3Campaign??{active:null,claimed:[],progress:{},processed:[]},R3_MISSIONS);
export function getR3Board(save={}){
  const state=stateOf(save);
  const missions=R3_MISSIONS.map((m,i)=>{
    const progress=m.objectives.map((o,j)=>Math.min(o.count,Number(state.progress?.[m.id]?.[j])||0));
    const claimed=state.claimed.includes(m.id),active=state.active===m.id;
    const ready=active&&progress.every((n,j)=>n>=m.objectives[j].count);
    const available=!claimed&&!active&&(i===0||state.claimed.includes(R3_MISSIONS[i-1].id));
    const status=missionStatus({claimed,active,ready,available});
    return {...m,progress,status,claimed,active:status==='active'||status==='ready',ready:status==='ready'};
  });
  return {missions,essentialClaimed:uniqueClaimedCount(state.claimed,R3_MISSIONS),unlockedRegion:3,activeRegion:3,
    active:activeBoardMissions(missions),claimable:missions.filter(m=>m.status==='ready'),
    available:missions.filter(m=>m.status==='available')};
}
export function acceptR3Mission(save,id){
  const board=getR3Board(save),mission=board.missions.find(m=>m.id===id);
  if(!mission||mission.status!=='available'||board.active.length)return null;
  const state=stateOf(save);
  return {r3Campaign:{...state,active:id,progress:{...state.progress,[id]:mission.objectives.map(()=>0)}}};
}
export function recordR3Event(save,event){
  const state=stateOf(save),mission=R3_MISSIONS.find(m=>m.id===state.active);
  if(!mission)return null;
  const key=event.id?mission.id+':'+event.type+':'+event.id:null;
  if(key&&state.processed?.includes(key))return null;
  const current=state.progress?.[mission.id]??mission.objectives.map(()=>0);
  let changed=false;
  const progress=mission.objectives.map((task,i)=>{
    if(task.kind!==event.type||current[i]>=task.count)return current[i];
    changed=true;return Math.min(task.count,current[i]+1);
  });
  return changed?{r3Campaign:{...state,progress:{...state.progress,[mission.id]:progress},processed:key?[...(state.processed??[]).slice(-299),key]:state.processed??[]}}:null;
}
export function claimR3Mission(save,id){
  const mission=getR3Board(save).missions.find(m=>m.id===id);
  if(mission?.status!=='ready')return null;
  const state=stateOf(save);
  return {mission,patch:{r3Campaign:{...state,active:null,claimed:[...new Set([...state.claimed,id])]},
    profile:{...save.profile,gold:(Number(save.profile?.gold)||0)+(mission.reward.gold||0)}}};
}
