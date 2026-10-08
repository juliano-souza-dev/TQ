// World-space ballistic shots. Damage is resolved only at impact.
export function createProjectile({from,to,hit,damage,owner,targetId,speed=360}) {
  const dx=to.x-from.x,dy=to.y-from.y;
  const length=Math.hypot(dx,dy)||1;
  const miss=hit?0:Math.max(38,length*0.20);
  const sign=Math.random()<0.5?-1:1;
  const end={x:to.x+(-dy/length)*miss*sign,y:to.y+(dx/length)*miss*sign};
  const distance=Math.hypot(end.x-from.x,end.y-from.y);
  return {from:{...from},to:end,hit,damage,owner,targetId,elapsed:0,duration:Math.max(0.28,distance/speed),done:false};
}
export function advanceProjectiles(projectiles,dt,onImpact) {
  for (const p of projectiles) {
    if(p.done)continue;
    p.elapsed+=dt/1000;
    if(p.elapsed>=p.duration) {p.done=true;onImpact(p);}
  }
  return projectiles.filter(p=>!p.done);
}
export function renderProjectiles(ctx,projectiles,effects,camera,zoom,dpr,w,h) {
  const project=(x,y)=>({x:w/2+(x-camera.x)*zoom*dpr,y:h/2+(y-camera.y)*zoom*dpr});
  for(const p of projectiles) {
    const t=Math.min(1,p.elapsed/p.duration);
    const a=project(p.from.x,p.from.y),b=project(p.to.x,p.to.y);
    const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t-Math.sin(Math.PI*t)*Math.min(46,Math.hypot(b.x-a.x,b.y-a.y)*0.17);
    ctx.save();ctx.shadowColor='#ffc875';ctx.shadowBlur=13*dpr;ctx.fillStyle='#272b31';
    ctx.beginPath();ctx.arc(x,y,5*dpr,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  for(const e of effects) {
    const p=project(e.x,e.y),t=e.elapsed/e.duration;
    ctx.save();ctx.globalAlpha=Math.max(0,1-t);
    if(e.kind==='muzzle') {ctx.fillStyle='#ffc45a';ctx.beginPath();ctx.arc(p.x,p.y,(12+24*t)*dpr,0,Math.PI*2);ctx.fill();}
    else if(e.kind==='hit') {ctx.fillStyle='#ff9b43';ctx.beginPath();ctx.arc(p.x,p.y,(8+29*t)*dpr,0,Math.PI*2);ctx.fill();}
    else {ctx.strokeStyle='#bcecff';ctx.lineWidth=3*dpr;ctx.beginPath();ctx.arc(p.x,p.y,(6+25*t)*dpr,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
}
