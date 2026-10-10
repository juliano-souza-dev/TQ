const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export class DamageTextRenderer {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.items=[];
  }

  add({target,damage,startTime=performance.now()}={}){
    const value=Math.max(0,Math.round(Number(damage)||0));
    if(!target||!value)return false;
    this.items.push({
      target,
      damage:value,
      startTime:Number(startTime)||performance.now(),
      duration:820,
      lane:(this.items.length%3)-1,
    });
    if(this.items.length>48)this.items.splice(0,this.items.length-48);
    return true;
  }

  render(camera,zoom=1,now=performance.now()){
    const rect=this.canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(rect.width*dpr));
    const h=Math.max(1,Math.round(rect.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){
      this.canvas.width=w;
      this.canvas.height=h;
    }
    const ctx=this.ctx;
    ctx.clearRect(0,0,w,h);

    const visualScale=clamp((Number(zoom)||1)/.88,.32,1.08);
    const alive=[];
    for(const item of this.items){
      const age=now-item.startTime;
      if(age<0||age>=item.duration)continue;
      const target=item.target;
      const tx=Number(target?.visualX??target?.x);
      const ty=Number(target?.visualY??target?.y);
      if(!Number.isFinite(tx)||!Number.isFinite(ty))continue;

      const progress=clamp(age/item.duration,0,1);
      const fade=1-Math.pow(progress,1.65);
      const x=w/2+(tx-camera.x)*zoom*dpr+(item.lane*6*visualScale*dpr);
      const y=h/2+(ty-camera.y)*zoom*dpr-(38+30*progress)*visualScale*dpr;
      if(x<-80*dpr||x>w+80*dpr||y<-80*dpr||y>h+80*dpr){
        alive.push(item);
        continue;
      }

      ctx.save();
      ctx.globalAlpha=fade;
      ctx.fillStyle='#ff3b3b';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.font='900 '+Math.round(clamp(18*visualScale,8,20)*dpr)+'px system-ui, sans-serif';
      ctx.fillText('-'+item.damage,x,y);
      ctx.restore();
      alive.push(item);
    }
    this.items=alive;
  }

  clear(){
    this.items.length=0;
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
  }
}
