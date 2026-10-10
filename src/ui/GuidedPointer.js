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
