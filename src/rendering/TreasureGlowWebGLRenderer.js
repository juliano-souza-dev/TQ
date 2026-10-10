const VERTEX=`#version 300 es
precision highp float;
in vec2 aPosition;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uSize;
out vec2 vUv;
void main(){
  vUv=aPosition*.5+.5;
  vec2 px=uCenter+aPosition*uSize*.5;
  vec2 clip=vec2(px.x/max(uResolution.x,1.0)*2.0-1.0,1.0-px.y/max(uResolution.y,1.0)*2.0);
  gl_Position=vec4(clip,0.0,1.0);
}`;

const FRAGMENT=`#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform float uSelected;
out vec4 outColor;
void main(){
  vec2 p=vUv*2.0-1.0;
  float d=length(p*vec2(1.0,0.78));
  float pulse=.82+.18*sin(uTime*3.0);
  float core=smoothstep(.78,.10,d);
  float ring=smoothstep(.95,.72,d)-smoothstep(.72,.50,d);
  float spark=pow(max(0.0,cos(atan(p.y,p.x)*6.0-uTime*1.8)),18.0)*smoothstep(.92,.35,d);
  float strength=mix(.72,1.15,uSelected);
  float alpha=clamp((core*.22+ring*.32+spark*.25)*pulse*strength,0.0,.72);
  vec3 gold=vec3(1.0,.68,.18);
  vec3 hot=vec3(1.0,.94,.58);
  vec3 color=mix(gold,hot,clamp(core+spark,0.0,1.0))*strength;
  if(alpha<.006)discard;
  outColor=vec4(color,alpha);
}`;

function compile(gl,type,src){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,src);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const message=gl.getShaderInfoLog(shader)||'shader';
    gl.deleteShader(shader);throw new Error(message);
  }
  return shader;
}

function makeProgram(gl){
  const vs=compile(gl,gl.VERTEX_SHADER,VERTEX),fs=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
  const program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    const message=gl.getProgramInfoLog(program)||'link';
    gl.deleteProgram(program);throw new Error(message);
  }
  return program;
}

export class TreasureGlowWebGLRenderer{
  constructor(canvas){
    this.canvas=canvas;this.gl=null;this.program=null;this.buffer=null;this.position=-1;this.u={};this.ready=false;
  }
  init(){
    try{
      const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:'low-power'});
      if(!gl)return false;
      this.gl=gl;this.program=makeProgram(gl);this.buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      this.position=gl.getAttribLocation(this.program,'aPosition');
      for(const name of ['uResolution','uCenter','uSize','uTime','uSelected'])this.u[name]=gl.getUniformLocation(this.program,name);
      gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      this.ready=true;return true;
    }catch(error){
      console.warn('[TabuadaQuest] Brilho WebGL dos destroços indisponível:',error);
      this.ready=false;return false;
    }
  }
  render(treasures,camera,zoom,timeMs,selectedId=null){
    if(!this.ready)return false;
    const bounds=this.canvas.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return false;
    const gl=this.gl,dpr=Math.min(globalThis.devicePixelRatio||1,1.5);
    const w=Math.max(1,Math.round(bounds.width*dpr)),h=Math.max(1,Math.round(bounds.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;gl.viewport(0,0,w,h);}
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.enableVertexAttribArray(this.position);gl.vertexAttribPointer(this.position,2,gl.FLOAT,false,0,0);
    gl.uniform2f(this.u.uResolution,w,h);gl.uniform1f(this.u.uTime,(Number(timeMs)||0)/1000);
    let drawn=0;
    const visualZoom=Math.max(.46,Math.min(1.15,Number(zoom)||1));
    for(const wreck of treasures){
      const cx=w/2+(wreck.x-camera.x)*zoom*dpr;
      const cy=h/2+(wreck.y-camera.y)*zoom*dpr;
      const size=112*visualZoom*dpr;
      if(cx<-size||cx>w+size||cy<-size||cy>h+size)continue;
      gl.uniform2f(this.u.uCenter,cx,cy);
      gl.uniform1f(this.u.uSize,size);
      gl.uniform1f(this.u.uSelected,wreck.id===selectedId?1:0);
      gl.drawArrays(gl.TRIANGLES,0,6);drawn++;
    }
    return drawn>0;
  }
  dispose(){
    const gl=this.gl;
    if(gl){if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);}
    this.gl=null;this.program=null;this.buffer=null;this.ready=false;
  }
}
