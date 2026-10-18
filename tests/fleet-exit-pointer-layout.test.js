import test from 'node:test';
import assert from 'node:assert/strict';
import {placeGuideNearShip,angleToGuidedTarget} from '../src/ui/GuidedPointer.js';

const intersects=(point,rect,w=138,h=82)=>{
 const left=point.x-w/2,right=point.x+w/2,top=point.y-h/2,bottom=point.y+h/2;
 return left<rect.right&&right>rect.left&&top<rect.bottom&&bottom>rect.top;
};
test('R1 exit hand is near the ship and never covers the desktop combat HUD',()=>{
 const bounds={left:0,top:0,right:1440,bottom:900};
 const ship={x:920,y:480},hud={left:1138,right:1428,top:594,bottom:845};
 const radar={left:1250,right:1428,top:12,bottom:186};
 const point=placeGuideNearShip({ship,bounds,obstacles:[hud,radar]});
 assert.ok(Math.hypot(point.x-ship.x,point.y-ship.y)<=240);
 assert.equal(intersects(point,hud),false,'combat buttons stay visible');
 assert.equal(intersects(point,radar),false,'minimap stays visible');
 assert.ok(point.y>41&&point.y<859);
 const angle=angleToGuidedTarget({
  pointerX:point.x,pointerY:point.y,targetX:1300,targetY:250,
 });
 assert.ok(Number.isFinite(angle));
});
test('small landscape screens keep hand away from joystick and right-side combat buttons',()=>{
 const bounds={left:0,top:0,right:700,bottom:394};
 const ship={x:350,y:195};
 const obstacles=[
  {left:492,top:112,right:698,bottom:393},
  {left:0,top:235,right:160,bottom:394},
  {left:545,top:0,right:695,bottom:155},
  {left:5,top:5,right:228,bottom:60},
 ];
 const point=placeGuideNearShip({ship,bounds,obstacles});
 assert.ok(point.x>=69&&point.x<=631);
 assert.ok(point.y>=41&&point.y<=353);
 for(const area of obstacles)assert.equal(intersects(point,area),false);
 assert.ok(Math.hypot(point.x-ship.x,point.y-ship.y)<=240);
});
test('exit guide is anchored to ship not destination even if destination is offscreen',()=>{
 const ship={x:540,y:325},bounds={left:0,top:0,right:1080,bottom:640};
 const first=placeGuideNearShip({ship,bounds});
 assert.deepEqual(placeGuideNearShip({ship,bounds}),first);
 assert.ok(Math.hypot(first.x-ship.x,first.y-ship.y)<210);
 const destination={x:7000,y:-2500};
 const angle=angleToGuidedTarget({
  pointerX:first.x,pointerY:first.y,targetX:destination.x,targetY:destination.y
 });
 assert.ok(angle<0,'points toward distant northeastern exit');
});
