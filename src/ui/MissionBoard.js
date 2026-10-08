// O quadro exibe apenas a etapa atual. O catálogo de contratos é regra interna.
export function createMissionBoard({getBoard=()=>null,onAccept=()=>false,onClaim=()=>false,onStartRegion2=()=>false}={}){
 const element=document.createElement('section');element.className='campaign-board';
 element.setAttribute('aria-label','Missão atual');
 const title=document.createElement('h3'),summary=document.createElement('p'),slot=document.createElement('div');
 summary.className='campaign-progress';slot.className='campaign-missions';element.append(title,summary,slot);
 const btn=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='primary-button';b.textContent=label;b.addEventListener('click',action);return b;};
 const rewards=r=>[
 r.gold&&r.gold+' ouro',r.iron&&r.iron+' munições comuns',
 ...Object.entries(r.ammo??{}).map(([id,n])=>n+' '+({'volcanic-lava':'orbes vulcânicos','terror-rose':'Rosas do Terror','halloween-purple-ball':'munições Halloween'}[id]??id)),
 ...Object.entries(r.cannons??{}).map(([id,n])=>n+' '+({'royal-lion':'Canhão Real Dourado','blue-gold-pirate':'canhões iniciais'}[id]??id)),
 ...(r.ships??[]).map(id=>id==='galeao-rosas-de-ouro'?'Galeão Rosas de Ouro':id),
 ].filter(Boolean).join(' · ')||'Desbloqueio de região';
 function refresh(){
  const board=getBoard();if(!board)return;
  title.textContent='📜 Missões da Enseada';
  summary.textContent=board.essentialClaimed+'/'+board.missions.filter(m=>!m.optional).length+' missões concluídas';
  slot.replaceChildren();
  if(board.unlockedRegion>=2){
   const note=document.createElement('p');note.textContent='🎉 A próxima região está liberada!';slot.append(note);
   if(board.activeRegion<2)slot.append(btn('Ir para a próxima região',()=>{if(onStartRegion2())refresh();}));
   return;
  }
  const current=board.claimable.find(m=>!m.optional)||board.active.find(m=>!m.optional)||board.available.find(m=>!m.optional);
  if(!current){const note=document.createElement('p');note.textContent='Nenhuma nova missão disponível no momento.';slot.append(note);return;}
  const card=document.createElement('article');card.className='campaign-contract campaign-contract--'+current.status;
  const h=document.createElement('h4');h.textContent=current.name;
  const desc=document.createElement('p');desc.textContent=current.description;
  const detail=document.createElement('div');detail.className='campaign-objectives';
  for(let i=0;i<current.objectives.length;i++){
   const task=current.objectives[i],value=Math.floor(current.progress[i]??0),row=document.createElement('p');
   row.textContent=(value>=task.count?'✅ ':'◻️ ')+task.label+' · '+value+'/'+task.count;
   detail.append(row);
  }
  const prize=document.createElement('p');prize.className='campaign-reward';prize.textContent='🎁 '+rewards(current.reward);
  card.append(h,desc,detail,prize);
  if(current.status==='available')card.append(btn('Iniciar missão',()=>{if(onAccept(current.id))refresh();}));
  if(current.status==='ready')card.append(btn('Resgatar recompensa',()=>{if(onClaim(current.id))refresh();}));
  if(current.status==='active'){const status=document.createElement('p');status.className='campaign-status';status.textContent='⚓ Em andamento';card.append(status);}
  slot.append(card);
 }
 return {element,show:()=>{element.hidden=false;refresh();},refresh,setHidden:value=>{element.hidden=value;}};
}
