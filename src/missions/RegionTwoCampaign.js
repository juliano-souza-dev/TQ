// Campanha independente da Costa dos Corsários.
export const R2_MISSIONS = Object.freeze([
  {id:'r2-thieves',name:'Frota dos Ladrões',description:'Alguns corsários juraram lealdade ao ladrão que fugiu com suas riquezas. Destrua a frota e recupere as arcas que escondem pistas do Grande Tesouro.',objectives:[{kind:'defeat',count:20,label:'Destruir 20 corsários'},{kind:'treasure',count:5,label:'Resgatar 5 tesouros'}],reward:{gold:750,iron:2000}},
  {id:'r2-informant',name:'O Corsário Informante',description:'Um capitão conhece o esconderijo do ladrão. Afunde cinco navios da escolta e resolva três desafios para obter sua informação.',objectives:[{kind:'defeat',count:5,label:'Derrotar 5 navios da escolta'},{kind:'informant',count:3,label:'Responder 3 questões ao informante'}],reward:{gold:200,iron:2000}},
  {id:'r2-map',name:'O Mapa Rasgado',description:'O informante revelou um mapa dividido em três partes. Resgate três arcas para recuperar seus fragmentos.',objectives:[{kind:'treasure',count:3,label:'Encontrar 3 fragmentos em arcas'}],reward:{gold:500,iron:500}},
  {id:'r2-island',name:'A Ilha Esquecida',description:'Os fragmentos indicam uma ilha esquecida. Navegue até ela e decifre três desafios para revelar o esconderijo.',objectives:[{kind:'discover',count:1,label:'Encontrar a Ilha Esquecida'},{kind:'study',count:3,label:'Decifrar 3 multiplicações'}],reward:{gold:700,iron:800}},
  {id:'r2-admiral',name:'O Almirante dos Ladrões',description:'O ladrão serve a um poderoso almirante. Rompa a guarda e destrua o navio do comandante para recuperar parte da fortuna.',objectives:[{kind:'defeat',count:10,label:'Destruir 10 navios da guarda'},{kind:'admiral',count:1,label:'Afundar o Almirante dos Ladrões'}],reward:{gold:2000,iron:3000}},
  {id:'r2-false-admiral',name:'O Falso Almirante',description:'Entre os destroços, uma revelação: o capitão derrotado era um impostor. O verdadeiro Almirante nem sequer navega por estas águas. Vasculhe as arcas da Costa dos Corsários e encontre pistas de seu paradeiro.',objectives:[{kind:'treasure',count:15,label:'Coletar 15 tesouros em busca de pistas'}],reward:{gold:650,iron:1200}},
  {id:'r2-shadow-plans',name:'Os Planos da Fragata',description:'As pistas revelam o modelo do navio do ladrão: uma fragata veloz. Recupere as plantas roubadas nas arcas dos corsários.',objectives:[{kind:'treasure',count:4,label:'Recuperar 4 arcas com peças dos planos'}],reward:{gold:900,iron:900}},
  {id:'r2-shadow-materials',name:'Madeira e Pólvora',description:'A velocidade exige um casco leve e artilharia preparada. Afunde os corsários que guardam as peças para construir sua própria fragata.',objectives:[{kind:'defeat',count:25,label:'Afundar 25 corsários para reunir materiais'}],reward:{gold:1200,iron:1800}},
  {id:'r2-shadow-trials',name:'A Caçadora das Sombras',description:'O mestre do estaleiro terminou sua fragata. Prove que sabe navegar: resgate cinco arcas e vença dez corsários antes de receber o navio.',objectives:[{kind:'treasure',count:5,label:'Resgatar 5 arcas de suprimentos'},{kind:'defeat',count:10,label:'Derrotar 10 corsários na prova final'}],reward:{gold:500,ships:['fragata-sombra-cacadora']}},
  {id:'r2-equip-chaser',name:'Preparar a Caçada',description:'A fragata está pronta! Siga a orientação até o Estaleiro e equipe a Fragata Caçadora das Sombras. O mestre lhe entregará 2 Canhões Aetherion MK-I, 15.000 Orbes Autoguiados e 10 unidades de cada consumível. A munição rastreia o alvo por até 9 segundos.',objectives:[{kind:'equip-ship',count:1,ship:'fragata-sombra-cacadora',label:'Equipar a Fragata Caçadora das Sombras no Estaleiro'}],reward:{cannons:{'aetherion-mk1':2},ammo:{'aetherion-seeker':15000},consumables:{'flame-5x':10,shield:10,'speed-plus':10}}},
  {id:'r2-destroy-thief',name:'Destrua o Ladrão',description:'Equipe a Fragata Caçadora das Sombras e o Canhão Aetherion MK-I. Encontre, persiga e afunde o Ladrão das Sombras.',objectives:[{kind:'thief',count:1,label:'Encontrar, perseguir e afundar o Ladrão das Sombras'}],reward:{gold:2500,iron:3000}},
].map(m=>Object.freeze({...m,objectives:Object.freeze(m.objectives.map(Object.freeze))})));

const stateOf = save => save.r2Campaign ?? {active:null,claimed:[],progress:{},processed:[]};
export function getR2Board(save={}) {
  const state=stateOf(save);
  const missions=R2_MISSIONS.map((m,i)=>{
    const progress=m.objectives.map((o,j)=>Math.min(o.count,Number(state.progress?.[m.id]?.[j])||0));
    const claimed=state.claimed.includes(m.id);
    const active=state.active===m.id;
    const status=claimed?'claimed':active?(progress.every((v,j)=>v>=m.objectives[j].count)?'ready':'active'):i===0||state.claimed.includes(R2_MISSIONS[i-1].id)?'available':'locked';
    return {...m,progress,status,claimed,active,ready:status==='ready'};
  });
  return {missions,essentialClaimed:state.claimed.length,unlockedRegion:1,activeRegion:2,active:missions.filter(m=>m.active),claimable:missions.filter(m=>m.ready),available:missions.filter(m=>m.status==='available')};
}
export function acceptR2Mission(save,id) {
  const board=getR2Board(save), mission=board.missions.find(m=>m.id===id);
  if(!mission||mission.status!=='available'||board.active.length)return null;
  const state=stateOf(save);
  return {r2Campaign:{...state,active:id,progress:{...state.progress,[id]:mission.objectives.map(()=>0)}}};
}
export function recordR2Event(save,event) {
  const state=stateOf(save),mission=R2_MISSIONS.find(m=>m.id===state.active);
  if(!mission)return null;
  const key=event.id?event.type+':'+event.id:null;
  if(key&&state.processed?.includes(key))return null;
  const current=state.progress?.[mission.id]??mission.objectives.map(()=>0);
  let changed=false;
  const progress=mission.objectives.map((task,i)=>{
    if(task.kind!==event.type||current[i]>=task.count||task.ship&&task.ship!==event.ship)return current[i];
    changed=true;
    return Math.min(task.count,current[i]+1);
  });
  return changed?{r2Campaign:{...state,progress:{...state.progress,[mission.id]:progress},processed:key?[...(state.processed??[]).slice(-299),key]:state.processed??[]}}:null;
}
export function claimR2Mission(save,id) {
  const mission=getR2Board(save).missions.find(m=>m.id===id);
  if(mission?.status!=='ready')return null;
  const state=stateOf(save),ammo=save.ammunition??{},equipment=save.equipment??{};
  const cannonCounts={...(equipment.cannonCounts??{})};
  const consumables=save.consumables??{},stock=consumables.quantities??{};
  const grantedConsumables=Object.fromEntries(Object.entries(mission.reward.consumables??{})
    .map(([item,amount])=>[item,(Number(stock[item])||0)+amount]));
  for(const [cannonId,amount] of Object.entries(mission.reward.cannons??{}))cannonCounts[cannonId]=(Number(cannonCounts[cannonId])||0)+amount;
  return {mission,patch:{...(id==='r2-equip-chaser'?{rewardMigrations:{...(save.rewardMigrations??{}),aetherionRewardV2:true,aetherionRewardV3:true}}:{}),...(mission.reward.consumables?{consumables:{...consumables,quantities:{...stock,...grantedConsumables}}}:{}),r2Campaign:{...state,active:null,claimed:[...state.claimed,id]},profile:{...save.profile,gold:(Number(save.profile?.gold)||0)+(mission.reward.gold||0)},ammunition:{...ammo,'rusted-iron':(Number(ammo['rusted-iron'])||0)+(mission.reward.iron||0),...Object.fromEntries(Object.entries(mission.reward.ammo??{}).map(([id,amount])=>[id,(Number(ammo[id])||0)+amount]))},...(mission.reward.ships?.length||mission.reward.cannons?{equipment:{...equipment,cannonCounts,ownedCannonIds:[...new Set([...(equipment.ownedCannonIds??[]),...Object.keys(mission.reward.cannons??{})])],ownedShipIds:[...new Set([...(equipment.ownedShipIds??[]),...(mission.reward.ships??[])])]}}:{})}};
}
