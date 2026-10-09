// Animated dark-waters passage: shader-driven vortex with a graceful Canvas fallback.
export function createDarkWatersPortal(canvas){
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false});
  if(!gl)return {render:render2d(canvas)};
  const vertex='attribute vec2 p; varying vec2 uv; void main(){uv=p;gl_Position=vec4(p,0.,1.);}';
  const fragment=`precision mediump float;
varying vec2 uv;uniform float t;
void main(){
 vec2 p=uv; p.x*=1.0; float r=length(p);
 float angle=atan(p.y,p.x);
 float spiral=sin(angle*8.0-r*32.0+t*2.8);
 float wave=sin(r*43.0-t*3.6+spiral*0.9);
 float ring=exp(-pow((r-.53)*15.0,2.0));
 float outer=exp(-pow((r-.72)*19.0,2.0));
 float core=exp(-pow(r*4.1,2.0));
 float filament=pow(max(0.0,spiral*wave),3.0)*smoothstep(.73,.2,r);
 float alpha=(ring*.9+outer*.6+core*.7+filament*.6)*smoothstep(.97,.75,r);
 vec3 cyan=vec3(.07,.9,1.0), violet=vec3(.43,.16,.95),gold=vec3(1.0,.72,.21);
 vec3 c=mix(violet,cyan,clamp(wave*.5+.5,0.,1.));
 c=mix(c,gold,outer*.52);
 c+=vec3(.06,.11,.2)*core;
 gl_FragColor=vec4(c*min(1.0,alpha*1.35),min(.96,alpha));
}`;
  function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
  try{
    const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error('portal shader link');
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const pos=gl.getAttribLocation(prog,'p'),time=gl.getUniformLocation(prog,'t');
    return {render(now){
      const dpr=Math.min(2,devicePixelRatio||1),w=Math.max(1,Math.round(canvas.clientWidth*dpr)),h=Math.max(1,Math.round(canvas.clientHeight*dpr));
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
      gl.uniform1f(time,now*.001);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }};
  }catch(error){console.warn('Dark portal WebGL fallback',error);return {render:render2d(canvas)};}
}
function render2d(canvas){
  const ctx=canvas.getContext('2d');return now=>{
    if(!ctx)return;
    const n=240;if(canvas.width!==n||canvas.height!==n){canvas.width=n;canvas.height=n;}
    ctx.clearRect(0,0,n,n);const cx=n/2,cy=n/2,t=now*.001;
    for(let i=0;i<9;i++){const radius=30+i*10;ctx.beginPath();ctx.ellipse(cx,cy,radius,radius*.55,t*.26+i*.13,0,Math.PI*2);ctx.strokeStyle=i%2?'#4c53d9aa':'#40e5ff99';ctx.lineWidth=5;ctx.stroke();}
    const g=ctx.createRadialGradient(cx,cy,4,cx,cy,62);g.addColorStop(0,'#bfffffea');g.addColorStop(1,'#552de000');ctx.fillStyle=g;ctx.fillRect(20,20,200,200);
  };
}