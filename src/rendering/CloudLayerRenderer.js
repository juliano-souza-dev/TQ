// Nuvens suaves da Costa dos Corsários. Canvas 2D transparente, baixo custo.
export class CloudLayerRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lastFrame = -Infinity;
    this.clouds = Array.from({length:18},(_,i)=>({
      x: 190 + ((i*997)%4000),
      y: 140 + ((i*719)%5100),
      radius: 115+(i%5)*38,
      drift: 5+(i%4)*3,
    }));
  }
  render(camera,zoom,timeMs) {
    if (!camera || !this.ctx || timeMs-this.lastFrame<60) return;
    this.lastFrame=timeMs;
    const bounds=this.canvas.getBoundingClientRect();
    const scale=Math.min(globalThis.devicePixelRatio||1,1.5);
    const width=Math.max(1,Math.round(bounds.width*scale));
    const height=Math.max(1,Math.round(bounds.height*scale));
    if(this.canvas.width!==width||this.canvas.height!==height){
      this.canvas.width=width;this.canvas.height=height;
    }
    const ctx=this.ctx;
    ctx.clearRect(0,0,width,height);
    const t=timeMs/1000;
    for(const cloud of this.clouds) {
      const x=width/2+(cloud.x+Math.sin(t*.07+cloud.y)*24+t*cloud.drift-camera.x)*zoom*scale;
      const y=height/2+(cloud.y-camera.y)*zoom*scale;
      const radius=cloud.radius*zoom*scale;
      if(x+radius<0||x-radius>width||y+radius<0||y-radius>height)continue;
      const gradient=ctx.createRadialGradient(x,y,radius*.1,x,y,radius);
      gradient.addColorStop(0,'rgba(248,253,255,.23)');
      gradient.addColorStop(.55,'rgba(240,249,255,.13)');
      gradient.addColorStop(1,'rgba(240,249,255,0)');
      ctx.fillStyle=gradient;
      ctx.beginPath();ctx.ellipse(x,y,radius,radius*.60,0,0,Math.PI*2);ctx.fill();
    }
  }
  dispose(){this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);}
}
