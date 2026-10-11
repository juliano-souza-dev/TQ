// Lightweight canvas ice effects drawn in world coordinates above the ships.
// The status timestamps remain the authoritative source for the visuals.
export function drawFrozenShip(ctx,x,y,size,now,until){
 const remaining=until-Date.now();if(remaining<=0)return;
 const r=Math.max(14,size*.43),t=now*.001;
 ctx.save();ctx.translate(x,y);
 ctx.globalCompositeOperation='screen';
 const alpha=Math.min(1,remaining/450);
 ctx.globalAlpha=alpha;
 const glow=ctx.createRadialGradient(0,0,r*.12,0,0,r*1.3);
 glow.addColorStop(0,'rgba(214,255,255,.18)');
 glow.addColorStop(.65,'rgba(54,207,255,.27)');
 glow.addColorStop(1,'rgba(44,165,255,0)');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*1.3,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#c9ffff';ctx.lineWidth=Math.max(1.5,r*.035);
 ctx.shadowColor='#5deaff';ctx.shadowBlur=r*.15;
 for(let i=0;i<9;i++){
  const a=i*Math.PI*2/9+t*.12,rr=r*(.72+.12*Math.sin(i*4+t));
  const sx=Math.cos(a)*rr,sy=Math.sin(a)*rr*.72;
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*r*.27,sy+Math.sin(a)*r*.27);
  ctx.lineTo(sx+Math.cos(a+.32)*r*.12,sy+Math.sin(a+.32)*r*.12);
  ctx.moveTo(sx+Math.cos(a)*r*.13,sy+Math.sin(a)*r*.13);
  ctx.lineTo(sx+Math.cos(a-.55)*r*.13,sy+Math.sin(a-.55)*r*.13);ctx.stroke();
 }
 ctx.beginPath();ctx.ellipse(0,0,r*.88,r*.42,0,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}
export function drawFreezeBurst(ctx,x,y,radius,now,startTime,scale=1){
 const age=now-startTime;if(age<0||age>1250)return;
 const progress=Math.min(1,age/900),r=radius*scale*progress;
 ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='screen';
 ctx.globalAlpha=(1-progress)*.9;
 ctx.strokeStyle='#a6faff';ctx.lineWidth=Math.max(2,6*scale*(1-progress));
 ctx.shadowColor='#32dcff';ctx.shadowBlur=18*scale;
 ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
 const fill=ctx.createRadialGradient(0,0,0,0,0,Math.max(1,r));
 fill.addColorStop(0,'rgba(220,255,255,.32)');
 fill.addColorStop(.8,'rgba(73,210,255,.13)');
 fill.addColorStop(1,'rgba(78,212,255,0)');
 ctx.fillStyle=fill;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
 for(let i=0;i<24;i++){
  const a=i*2.39996,dist=r*(.25+.7*((i*37%19)/19));
  const px=Math.cos(a)*dist,py=Math.sin(a)*dist;
  ctx.beginPath();ctx.moveTo(px,py-6*scale);ctx.lineTo(px+4*scale,py);
  ctx.lineTo(px,py+6*scale);ctx.lineTo(px-4*scale,py);ctx.closePath();ctx.fillStyle='#dcffff';ctx.fill();
 }
 ctx.restore();
}
