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
