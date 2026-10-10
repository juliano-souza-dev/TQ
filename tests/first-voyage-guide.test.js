import test from 'node:test';
import assert from 'node:assert/strict';
import {computeGuidePointerAngle} from '../src/ui/FirstVoyageGuide.js';

const viewportRect={left:0,top:0,width:1440,height:900};
const pointerRect={left:679,top:126,width:82,height:76};
const cameraView={x:1000,y:1000};
const p=(x,y,extras={})=>computeGuidePointerAngle({
  target:{x,y},cameraView,zoom:1,viewportRect,pointerRect,...extras,
});

test('guide hand points toward the ship visible below its own screen location',()=>{
  assert.equal(p(1000,1350),90);
  assert.ok(p(850,1350)>90 && p(850,1350)<180);
  assert.ok(p(1150,1350)>0 && p(1150,1350)<90);
});

test('fixed guide does not incorrectly aim from player position',()=>{
  const angle=p(1000,900);
  assert.equal(angle,90,'destination can be north of the player but south of the fixed hand');
});

test('manual camera pan and combat zoom are reflected in the screen direction',()=>{
  const target={x:1550,y:1200};
  const before=p(target.x,target.y);
  const after=p(target.x,target.y,{cameraView:{x:1900,y:1000}});
  assert.ok(before<90,'target to the right before pan');
  assert.ok(after>90,'target to the left after pan');
  const zoomed=p(1100,1050,{zoom:.5});
  assert.ok(zoomed>0 && zoomed<90);
});

test('guide uses CSS viewport coordinates, including browser/canvas offset',()=>{
  const shifted=p(1000,1350,{
    viewportRect:{left:40,top:100,width:1440,height:900},
    pointerRect:{left:719,top:226,width:82,height:76},
  });
  assert.equal(shifted,90);
});
