// Projectile simulation is independent from rendering and inventory.
export function createProjectile({from,to,damage,owner,targetId,speed=210,accuracy=1,random=Math.random}) {
  const dx=to.x-from.x,dy=to.y-from.y,range=Math.hypot(dx,dy)||1;
  const spread=(1-Math.max(0,Math.min(1,accuracy)))*range*0.7;
  const lateral=(random()*2-1)*spread;
  const longitudinal=(random()*2-1)*spread*.35;
  const end={x:to.x-dy/range*lateral+dx/range*longitudinal,
    y:to.y+dx/range*lateral+dy/range*longitudinal};
  const distance=Math.hypot(end.x-from.x,end.y-from.y);
  return {from:{...from},to:end,damage,owner,targetId,elapsed:0,
    duration:Math.max(.85,distance/speed),done:false};
}
export function projectilePosition(p,t) {
  const f=Math.max(0,Math.min(1,t));
  return {x:p.from.x+(p.to.x-p.from.x)*f,y:p.from.y+(p.to.y-p.from.y)*f,
    height:Math.sin(Math.PI*f)*Math.min(90,Math.hypot(p.to.x-p.from.x,p.to.y-p.from.y)*.35)};
}
export function advanceProjectiles(projectiles,dt,onImpact,getTarget) {
  for(const p of projectiles){
    if(p.done)continue;
    const previous=Math.min(1,p.elapsed/p.duration);
    p.elapsed+=dt/1000;
    const current=Math.min(1,p.elapsed/p.duration);
    const target=getTarget?.(p);
    if(target?.health>0){
      const a=projectilePosition(p,previous),b=projectilePosition(p,current);
      const vx=b.x-a.x,vy=b.y-a.y;
      const t=Math.max(0,Math.min(1,((target.x-a.x)*vx+(target.y-a.y)*vy)/(vx*vx+vy*vy||1)));
      const closest={x:a.x+vx*t,y:a.y+vy*t};
      if(Math.hypot(closest.x-target.x,closest.y-target.y)<32 && current>.08){
        p.done=true;onImpact(p,{kind:'hit',x:closest.x,y:closest.y});continue;
      }
    }
    if(current>=1){p.done=true;onImpact(p,{kind:'splash',...p.to});}
  }
  return projectiles.filter(p=>!p.done);
}
export function renderProjectiles(ctx,projectiles,effects,camera,zoom,dpr,w,h) {
  const project=(x,y)=>({x:w/2+(x-camera.x)*zoom*dpr,y:h/2+(y-camera.y)*zoom*dpr});
  const location=(p,t)=>{
    const a=project(p.from.x,p.from.y),b=project(p.to.x,p.to.y);
    const arc=Math.sin(Math.PI*t)*Math.min(75,Math.hypot(b.x-a.x,b.y-a.y)*0.28);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t-arc};
  };
  for(const p of projectiles) {
    const t=Math.min(1,p.elapsed/p.duration);
    const pos=location(p,t);
    ctx.save();
    // A luminous trail makes the projectile visible even against bright water.
    ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=0;i<3;i++){
      ctx.beginPath();
      for(let j=0;j<=10;j++){
        const point=location(p,Math.max(0,t-(0.22-i*0.045)*(1-j/10)));
        if(j===0)ctx.moveTo(point.x,point.y);else ctx.lineTo(point.x,point.y);
      }
      ctx.strokeStyle=i===0?'#ff7c1c':i===1?'#ffcc56':'#fff5c9';
      ctx.lineWidth=(12-i*4)*dpr;ctx.globalAlpha=i===0?.42:i===1?.75:1;
      ctx.shadowColor='#ff8b21';ctx.shadowBlur=14*dpr;ctx.stroke();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=16*dpr;ctx.shadowColor='#fff5a2';
    ctx.fillStyle='#17191e';ctx.strokeStyle='#fff1b1';ctx.lineWidth=2.5*dpr;
    ctx.beginPath();ctx.arc(pos.x,pos.y,9*dpr,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.restore();
  }
  for(const e of effects) {
    const p=project(e.x,e.y),t=e.elapsed/e.duration;
    ctx.save();ctx.globalAlpha=Math.max(0,1-t);
    if(e.kind==='muzzle') {
      ctx.shadowColor='#ff8b20';ctx.shadowBlur=32*dpr;ctx.fillStyle='#fff2a2';
      ctx.beginPath();ctx.arc(p.x,p.y,(18+38*t)*dpr,0,Math.PI*2);ctx.fill();
    } else if(e.kind==='hit') {
      ctx.shadowColor='#ff9b43';ctx.shadowBlur=25*dpr;ctx.fillStyle='#ff9b43';
      ctx.beginPath();ctx.arc(p.x,p.y,(12+38*t)*dpr,0,Math.PI*2);ctx.fill();
    } else {
      ctx.strokeStyle='#d9faff';ctx.shadowColor='#7eeaff';ctx.shadowBlur=15*dpr;ctx.lineWidth=5*dpr;
      ctx.beginPath();ctx.arc(p.x,p.y,(8+38*t)*dpr,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
}
