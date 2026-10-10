const VERTEX=`#version 300 es
precision highp float;
in vec2 aPosition;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec2 uSize;
out vec2 vUv;
void main(){
  vUv=aPosition*0.5+0.5;
  vec2 px=uCenter+aPosition*uSize*0.5;
  vec2 clip=vec2(px.x/max(uResolution.x,1.0)*2.0-1.0,1.0-px.y/max(uResolution.y,1.0)*2.0);
  gl_Position=vec4(clip,0.0,1.0);
}`;

const FRAGMENT=`#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uCoreIntensity;
uniform float uHaloIntensity;
uniform float uWispIntensity;
uniform float uDistortion;
out vec4 outColor;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
void main(){
  vec2 p=vUv*2.0-1.0;
  float t=uTime*uPulseSpeed;
  float n=noise(p*3.2+vec2(t*0.18,-t*0.11));
  vec2 warped=p+vec2(sin(p.y*7.0+t),cos(p.x*6.0-t*0.8))*uDistortion*0.08*(0.35+n);
  float d=length(warped*vec2(0.90,1.08));
  float pulse=0.88+0.12*sin(t*2.0+n*4.0);
  float halo=smoothstep(1.0,0.06,d)*uHaloIntensity*pulse;
  float core=smoothstep(0.56,0.02,d)*uCoreIntensity*(0.82+0.18*sin(t*2.7+n*5.0));
  float ring=smoothstep(0.92,0.64,d)-smoothstep(0.64,0.38,d);
  float wisps=smoothstep(0.58,0.92,n+0.24*sin(p.y*10.0-t*1.4))*smoothstep(1.0,0.18,d)*uWispIntensity;
  float alpha=clamp(halo*0.34+core*0.24+ring*0.18+wisps*0.20,0.0,0.62);
  vec3 deep=vec3(0.02,0.25,0.11);
  vec3 bright=vec3(0.28,1.0,0.52);
  vec3 color=mix(deep,bright,clamp(core+ring*0.7+wisps,0.0,1.0));
  color*=1.0+core*0.72+wisps*0.38;
  if(alpha<0.006)discard;
  outColor=vec4(color,alpha);
}`;

function compile(gl,type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(shader)||'shader';gl.deleteShader(shader);throw new Error(msg);}
  return shader;
}
function program(gl){
  const v=compile(gl,gl.VERTEX_SHADER,VERTEX),f=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT),p=gl.createProgram();
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const msg=gl.getProgramInfoLog(p)||'link';gl.deleteProgram(p);throw new Error(msg);}
  return p;
}

export class SpectralShipWebGLRenderer{
  constructor(canvas){this.canvas=canvas;this.gl=null;this.program=null;this.buffer=null;this.ready=false;this.u={};this.position=-1;}
  init(){
    try{
      const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
      if(!gl)return false;
      this.gl=gl;this.program=program(gl);this.buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      this.position=gl.getAttribLocation(this.program,'aPosition');
      for(const name of ['uResolution','uCenter','uSize','uTime','uPulseSpeed','uCoreIntensity','uHaloIntensity','uWispIntensity','uDistortion'])this.u[name]=gl.getUniformLocation(this.program,name);
      gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      this.ready=true;return true;
    }catch(error){console.warn('[TabuadaQuest] Efeito Fantasma Esmeralda indisponível:',error);this.ready=false;return false;}
  }
  render(entities,camera,zoom,timeMs,definition){
    if(!this.ready||!definition?.spectralEffect?.enabled)return false;
    const gl=this.gl,bounds=this.canvas.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return false;
    const dpr=Math.min(globalThis.devicePixelRatio||1,1.5),w=Math.max(1,Math.round(bounds.width*dpr)),h=Math.max(1,Math.round(bounds.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);}
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
    gl.uniform2f(this.u.uResolution,w,h);
    const fx=definition.spectralEffect;
    gl.uniform1f(this.u.uTime,Math.max(0,Number(timeMs)||0)/1000);
    gl.uniform1f(this.u.uPulseSpeed,fx.pulseSpeed);
    gl.uniform1f(this.u.uCoreIntensity,fx.coreIntensity);
    gl.uniform1f(this.u.uHaloIntensity,fx.haloIntensity);
    gl.uniform1f(this.u.uWispIntensity,fx.wispIntensity);
    gl.uniform1f(this.u.uDistortion,fx.distortion);
    let drawn=0;
    for(const npc of entities.values()){
      if(npc.shipId!==definition.id||npc.health<=0)continue;
      const cx=w/2+(npc.x-camera.x)*zoom*dpr,cy=h/2+(npc.y-camera.y)*zoom*dpr;
      const base=Math.min(w*.32,h*.32,185*dpr)*zoom;
      const size=base*Math.max(1,Number(fx.glowRadius)||1);
      if(cx<-size||cx>w+size||cy<-size||cy>h+size)continue;
      gl.uniform2f(this.u.uCenter,cx,cy);gl.uniform2f(this.u.uSize,size,size);
      gl.drawArrays(gl.TRIANGLES,0,6);drawn++;
    }
    return drawn>0;
  }
  dispose(){
    const gl=this.gl;if(gl){if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);}
    this.ready=false;this.gl=null;this.program=null;this.buffer=null;
  }
}
