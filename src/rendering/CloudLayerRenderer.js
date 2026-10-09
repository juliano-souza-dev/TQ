// Nuvens próprias da Costa dos Corsários: camada leve sobre a água, sem neblina.
export class CloudLayerRenderer {
  constructor(canvas) {
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.clouds=Array.from({length:45},(_,i)=>({
      x:100+((i*719)%4100),
      y:100+((i*1277)%5100),
      radius:170+(i%6)*27,
      phase:i*.73,
    }));
  }
  render(camera,zoom,timeMs) {
    if(!camera||!this.ctx)return;
    const bounds=this.canvas.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const scale=Math.min(globalThis.devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.round(bounds.width*scale));
    const height=Math.max(1,Math.round(bounds.height*scale));
    if(this.canvas.width!==width||this.canvas.height!==height){
      this.canvas.width=width;this.canvas.height=height;
    }
    const ctx=this.ctx;
    ctx.clearRect(0,0,width,height);
    const t=timeMs/1000;
    // Nuvens em camada atmosférica: parallax discreto, independente do arrasto do mar.
    const parallax=0.07;
    for(const cloud of this.clouds) {
      // Oscilação limitada: nunca atravessa o mapa inteiro com o passar do tempo.
      const x=width/2+(cloud.x-camera.x*parallax+Math.sin(t*.09+cloud.phase)*65)*zoom*scale;
      const y=height/2+(cloud.y-camera.y*parallax+Math.cos(t*.045+cloud.phase)*15)*zoom*scale;
      const r=cloud.radius*zoom*scale;
      if(x+r*1.6<0||x-r*1.6>width||y+r<0||y-r>height)continue;
      ctx.save();
      ctx.translate(x,y);
      // Bordas difusas; manchas múltiplas formam uma nuvem, não um círculo.
      for(const [dx,dy,rx,ry,alpha] of [
        [-.43,.11,.77,.39,.43],[.32,.06,.72,.37,.39],
        [0,-.17,.68,.46,.49],[.06,.26,.94,.27,.24]
      ]){
        const cx=dx*r,cy=dy*r;
        const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,rx*r);
        gradient.addColorStop(0,'rgba(255,255,255,'+alpha+')');
        gradient.addColorStop(.52,'rgba(249,253,255,'+(alpha*.67)+')');
        gradient.addColorStop(1,'rgba(249,253,255,0)');
        ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);
        ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,rx*r,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();
    }
  }
  dispose(){this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);}
}
