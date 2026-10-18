import { createViewProjection } from '../rendering/OrbitalCameraProjection.js';
import { screenPointToWorld } from './WorldNavigationInput.mjs';

// Pointer gestures on the ocean only. HUD and joystick retain independent pointers.
export function createClickNavigation(canvas, world, onWorldClick = null) {
  let destination = null;
  let gesture = null;
  let suppressClick = false;
  let lastTouchTap=null;
  const inFireDeadZone=event=>{
    if(document.documentElement.dataset.tqLayout!=='mobile-portrait')return false;
    const button=document.querySelector('.combat-fire-icon-button');
    if(!button)return false;
    const r=button.getBoundingClientRect(),halo=24;
    return event.clientX>=r.left-halo&&event.clientX<=r.right+halo
      &&event.clientY>=r.top-halo&&event.clientY<=r.bottom+halo;
  };
  const clamp = (value, extent, half) => extent <= 2 * half
    ? extent / 2 : Math.max(half, Math.min(extent - half, value));
  const down = event => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    const blocked=inFireDeadZone(event);
    gesture = { id:event.pointerId,startX:event.clientX,startY:event.clientY,
      lastX:event.clientX,lastY:event.clientY,startedAt:performance.now(),blocked,dragging:false };
    if(blocked)event.preventDefault();
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id || gesture.blocked) return;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    if (!gesture.dragging && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 10) {
      gesture.dragging = true;
      destination = null;
      if (!world.manualCamera) world.manualCamera = { ...world.cameraView };
    }
    if (gesture.dragging) {
      const zoom = Math.max(world.camera.zoom, 0.01);
      const halfW = canvas.clientWidth / (2 * zoom);
      const halfH = canvas.clientHeight / (2 * zoom);
      let panX=-dx/zoom, panY=-dy/zoom;
      if(world.cameraPerspective?.enabled){
        const rect=canvas.getBoundingClientRect();
        const view=createViewProjection(world.cameraView,zoom,rect.width,rect.height,1,world.cameraPerspective);
        const previous=view.unprojectGround({x:gesture.lastX-rect.left,y:gesture.lastY-rect.top});
        const current=view.unprojectGround({x:event.clientX-rect.left,y:event.clientY-rect.top});
        if(previous&&current){panX=previous.x-current.x;panY=previous.y-current.y;}
      }
      world.manualCamera.x = clamp(world.manualCamera.x + panX, world.region.width, halfW);
      world.manualCamera.y = clamp(world.manualCamera.y + panY, world.region.height, halfH);
      event.preventDefault();
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  };
  const end = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const moved=Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY);
    const tap=!gesture.blocked&&!gesture.dragging&&moved<10
      &&performance.now()-gesture.startedAt<200;
    suppressClick=!tap;
    lastTouchTap={at:performance.now(),allowed:tap};
    gesture=null;
  };
  const onClick = event => {
    if(event.pointerType==='touch'&&lastTouchTap
      &&performance.now()-lastTouchTap.at<550&&!lastTouchTap.allowed)return;
    if (suppressClick&&event.pointerType==='touch') { suppressClick=false; return; }
    if(inFireDeadZone(event))return;
    if (event.button !== 0 || event.detail === 0) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const zoom = Math.max(world.camera.zoom, 0.01);
    const cameraOrbit=world.cameraPerspective;
    const point=cameraOrbit?.enabled
      ? createViewProjection(world.cameraView,zoom,rect.width,rect.height,1,cameraOrbit)
        .unprojectGround({x:event.clientX-rect.left,y:event.clientY-rect.top})
      : screenPointToWorld(event.clientX,event.clientY,{
          viewportLeft:rect.left,viewportTop:rect.top,
          viewportWidth:rect.width,viewportHeight:rect.height,
          cameraX:world.cameraView.x,cameraY:world.cameraView.y,zoom,
          worldWidth:world.region.width,worldHeight:world.region.height,
        });
    if(!point)return;
    point.x=Math.max(0,Math.min(world.region.width,point.x));
    point.y=Math.max(0,Math.min(world.region.height,point.y));
    const handled = onWorldClick?.(point, {
      screen:{x:event.clientX-rect.left,y:event.clientY-rect.top},
      viewport:{width:rect.width,height:rect.height},
    });
    if (handled === true) { destination = null; return; }
    if (handled?.destination) {
      destination = {x:Number(handled.destination.x),y:Number(handled.destination.y)};
      return;
    }
    destination = point;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('click', onClick);
  return {
    getDestination: () => destination,
    setDestination: point => { destination=point?{x:Number(point.x),y:Number(point.y)}:null; },
    cancel: () => { destination = null; },
    dispose: () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('click', onClick);
    },
  };
}
