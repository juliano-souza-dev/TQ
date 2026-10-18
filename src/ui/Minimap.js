// All positions share one circular projection; no marker is drawn beneath the frame.
// The square-to-disc mapping covers the entire region, including its four corners.
export const RADAR_CENTER=120;
export const RADAR_RADIUS=81;
export const RADAR_PLOT_RADIUS=69;
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export function projectToMinimapCircle(x,y,regionWidth,regionHeight){
  const u=2*clamp01(x/Math.max(1,regionWidth))-1;
  const v=2*clamp01(y/Math.max(1,regionHeight))-1;
  return {
    x:RADAR_CENTER+RADAR_PLOT_RADIUS*u*Math.sqrt(1-v*v/2),
    y:RADAR_CENTER+RADAR_PLOT_RADIUS*v*Math.sqrt(1-u*u/2),
  };
}
// Only the closest hidden mandatory treasure gets a separate off-radar cue.
export function findTreasuresBehindMinimap(treasures,screenPoint,minimapRect,player){
  if(!minimapRect||typeof screenPoint!=='function')return null;
  let nearest=null;
  for(const treasure of treasures){
    const p=screenPoint(treasure.x,treasure.y);
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)
      ||p.x<minimapRect.left||p.x>minimapRect.right
      ||p.y<minimapRect.top||p.y>minimapRect.bottom)continue;
    const distance=Math.round(Math.hypot(treasure.x-(player?.x??0),treasure.y-(player?.y??0)));
    if(!nearest||distance<nearest.distance)nearest={treasure,distance};
  }
  return nearest;
}
export function createMinimap(world,{getPlayer,getNpcs=()=>[],getTreasures=()=>[],
  getExit=()=>null,hasTreasureSense=()=>false,getScreenPoint=()=>null}={}){
  const root=document.createElement('section');
  root.className='minimap';
  root.setAttribute('aria-label','Minimapa');
  const canvas=document.createElement('canvas');
  canvas.width=240;canvas.height=240;
  canvas.setAttribute('aria-label','Posição do navio, das ilhas, dos tesouros e da saída');
  root.append(canvas);
  const occludedTreasure=document.createElement('span');
  occludedTreasure.className='minimap-hidden-treasure';
  occludedTreasure.hidden=true;
  root.append(occludedTreasure);
  const ctx=canvas.getContext('2d');
  const point=(x,y)=>projectToMinimapCircle(x,y,world.region.width,world.region.height);
  const dot=(x,y,color,radius,outline='#071829')=>{
    const p=point(x,y);
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();
    ctx.lineWidth=2;ctx.strokeStyle=outline;ctx.stroke();
  };
  let lastOcclusionCheck=0;
  function render(){
    if(!ctx)return;
    ctx.clearRect(0,0,240,240);
    ctx.fillStyle='rgba(4,35,51,.88)';
    ctx.beginPath();ctx.arc(RADAR_CENTER,RADAR_CENTER,RADAR_RADIUS,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b58a4d';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(RADAR_CENTER,RADAR_CENTER,RADAR_RADIUS,0,Math.PI*2);ctx.stroke();
    ctx.save();
    ctx.beginPath();ctx.arc(RADAR_CENTER,RADAR_CENTER,RADAR_RADIUS-2,0,Math.PI*2);
    ctx.clip();
    const corruption=world.region.ocean?.corruption;
    if(corruption?.active&&Array.isArray(corruption.zones)){
      for(const zone of corruption.zones){
        if(!zone?.intensity)continue;
        const p=point(zone.x,zone.y);
        const radius=RADAR_PLOT_RADIUS*Math.max(0,zone.radius)/Math.max(1,Math.min(world.region.width,world.region.height));
        const gradient=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(1,radius));
        const alpha=Math.max(.05,Math.min(.32,Number(zone.intensity)*.26));
        gradient.addColorStop(0,'rgba(42,190,92,'+alpha+')');
        gradient.addColorStop(.55,'rgba(20,116,69,'+(alpha*.7)+')');
        gradient.addColorStop(1,'rgba(8,72,54,0)');
        ctx.fillStyle=gradient;
        ctx.beginPath();ctx.arc(p.x,p.y,Math.max(5,radius),0,Math.PI*2);ctx.fill();
      }
    }
    for(const island of world.region.islands??[])
      dot(island.x,island.y,island.kind==='decoration'?'#7b9988':'#f0c66a',island.kind==='decoration'?4:6);
    for(const npc of getNpcs())if(npc.health>0)
      dot(npc.x,npc.y,'#ef665e',4);
    const revealed=world.fleetNoRespawn||hasTreasureSense();
    const treasures=revealed?getTreasures():[];
    for(const treasure of treasures){
      const p=point(treasure.x,treasure.y);
      const pulse=.5+.5*Math.sin(Date.now()/420+treasure.x*.015);
      ctx.save();ctx.translate(p.x,p.y);
      ctx.shadowColor='#ffdf68';ctx.shadowBlur=8+pulse*8;
      ctx.fillStyle='rgba(255,207,74,'+(.2+pulse*.23)+')';
      ctx.beginPath();ctx.arc(0,0,5+pulse*2,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=6;ctx.fillStyle='#fff3ad';
      ctx.beginPath();ctx.arc(0,0,2.5+pulse*.6,0,Math.PI*2);ctx.fill();
      ctx.restore();
    }
    const exit=getExit();
    if(exit){
      const p=point(exit.x,exit.y);
      ctx.save();
      ctx.shadowBlur=12;ctx.shadowColor='#88fce5';
      ctx.fillStyle='#48efc2';ctx.strokeStyle='#052c33';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#062a31';ctx.fillText('➜',p.x,p.y);ctx.restore();
    }
    const player=getPlayer();
    if(player){
      const p=point(player.x,player.y);
      ctx.save();ctx.translate(p.x,p.y);
      ctx.rotate((player.heading??0)*Math.PI/180);
      ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(6,6);ctx.lineTo(0,3);ctx.lineTo(-6,6);ctx.closePath();
      ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#07263c';ctx.lineWidth=2;ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // The ornate HUD must not make a required wreck undiscoverable on the ocean.
    const now=Date.now();
    if(now-lastOcclusionCheck>240){
      lastOcclusionCheck=now;
      const hidden=treasures.length?findTreasuresBehindMinimap(
        treasures,getScreenPoint,root.getBoundingClientRect(),player):null;
      occludedTreasure.hidden=!hidden;
      if(hidden)occludedTreasure.textContent='🧰 Destroços atrás do radar · '+hidden.distance+' m';
    }
  }
  render();
  return {element:root,render};
}
