// Canonical TQ guided indication. The art points right before rotation.
export const GUIDED_POINTER_ASSET='./assets/ui/seta.png';

export function createGuidedPointerImage(extraClass=''){
  const image=document.createElement('img');
  image.className=['tq-guided-pointer-image',extraClass].filter(Boolean).join(' ');
  image.src=GUIDED_POINTER_ASSET;
  image.alt='';
  image.draggable=false;
  return image;
}

// Positive screen angles rotate clockwise: 0=right, 90=down, 180=left.
export function angleToGuidedTarget({pointerX,pointerY,targetX,targetY}){
  const dx=targetX-pointerX;
  const dy=targetY-pointerY;
  return dx===0&&dy===0 ? 90 : Math.atan2(dy,dx)*180/Math.PI;
}

export function computeGuidePointerAngle({target,cameraView,zoom=1,viewportRect,pointerRect}){
  const targetX=viewportRect.left+viewportRect.width/2+(target.x-cameraView.x)*zoom;
  const targetY=viewportRect.top+viewportRect.height/2+(target.y-cameraView.y)*zoom;
  return angleToGuidedTarget({
    pointerX:pointerRect.left+pointerRect.width/2,
    pointerY:pointerRect.top+pointerRect.height/2,
    targetX,targetY,
  });
}


// Place the exit hand beside the player's visible ship, never at the faraway
// destination or on top of a combat/control panel. Screen coordinates are CSS px.
// Pure geometry so desktop and landscape-mobile layouts can be regression tested.
export function placeGuideNearShip({
  ship, bounds, obstacles=[], width=138, height=82,
}){
  const halfW=width/2,halfH=height/2,padding=8;
  const clamp=(v,min,max)=>min>max?(min+max)/2:Math.min(max,Math.max(min,v));
  const centers=[
    [94,-92],[-94,-92],[94,92],[-94,92],
    [0,-116],[-118,0],[118,0],[0,116],
    [-150,-115],[150,-115],[-150,115],[150,115],
  ];
  const collisionArea=(left,top,right,bottom,rect)=>{
    if(!rect || !(rect.right>rect.left) || !(rect.bottom>rect.top))return 0;
    const a=Math.max(0,Math.min(right,rect.right+10)-Math.max(left,rect.left-10));
    const b=Math.max(0,Math.min(bottom,rect.bottom+10)-Math.max(top,rect.top-10));
    return a*b;
  };
  let choice=null;
  for(const [index,[dx,dy]] of centers.entries()){
    const idealX=ship.x+dx,idealY=ship.y+dy;
    const x=clamp(idealX,bounds.left+halfW+padding,bounds.right-halfW-padding);
    const y=clamp(idealY,bounds.top+halfH+padding,bounds.bottom-halfH-padding);
    const left=x-halfW,top=y-halfH,right=x+halfW,bottom=y+halfH;
    const overlap=obstacles.reduce((sum,rect)=>sum+collisionArea(left,top,right,bottom,rect),0);
    // Prioritize avoiding a HUD before the preferred upper-right placement.
    const score=overlap*1000+Math.hypot(x-idealX,y-idealY)*8+
      Math.abs(Math.hypot(x-ship.x,y-ship.y)-125)*.25+index*.1;
    if(!choice||score<choice.score)choice={x,y,score,overlap};
  }
  return {x:choice.x,y:choice.y};
}
