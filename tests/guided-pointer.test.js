import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDED_POINTER_ASSET,angleToGuidedTarget,computeGuidePointerAngle,createGuidedPointerImage} from '../src/ui/GuidedPointer.js';

test('shared pointer always uses the single canonical skeletal-hand asset',()=>{
  const oldDocument=globalThis.document;
  globalThis.document={createElement(tag){
    assert.equal(tag,'img');
    return {className:'',alt:'',draggable:true};
  }};
  try{
    const guide=createGuidedPointerImage('voyage-arrow-image');
    const thief=createGuidedPointerImage('thief-guide-image');
    const chest=createGuidedPointerImage('chase-supply-pointer');
    for(const image of [guide,thief,chest]){
      assert.equal(image.src,'./assets/ui/seta.png');
      assert.equal(image.alt,'');
      assert.equal(image.draggable,false);
      assert.match(image.className,/tq-guided-pointer-image/);
    }
    assert.equal(GUIDED_POINTER_ASSET,'./assets/ui/seta.png');
  }finally{
    if(oldDocument===undefined)delete globalThis.document;
    else globalThis.document=oldDocument;
  }
});

test('guide angle has consistent compass directions from actual pointer',()=>{
  const args={pointerX:100,pointerY:100};
  assert.equal(angleToGuidedTarget({...args,targetX:200,targetY:100}),0);
  assert.equal(angleToGuidedTarget({...args,targetX:100,targetY:200}),90);
  assert.equal(angleToGuidedTarget({...args,targetX:0,targetY:100}),180);
  assert.equal(angleToGuidedTarget({...args,targetX:100,targetY:0}),-90);
  assert.equal(angleToGuidedTarget({...args,targetX:100,targetY:100}),90);
});

test('primary pointer and route guide compute consistent heading from screen geometry',()=>{
  const target={x:1220,y:1600};
  const cameraView={x:1050,y:1400};
  const viewportRect={left:0,top:0,width:1440,height:900};
  const pointerRect={left:679,top:126,width:82,height:76};
  const guideAngle=computeGuidePointerAngle({target,cameraView,zoom:.88,viewportRect,pointerRect});
  const targetX=viewportRect.width/2+(target.x-cameraView.x)*.88;
  const targetY=viewportRect.height/2+(target.y-cameraView.y)*.88;
  assert.equal(guideAngle,angleToGuidedTarget({pointerX:720,pointerY:164,targetX,targetY}));
});

test('guided source no longer contains text-arrow fallbacks',async()=>{
  const fs=await import('node:fs/promises');
  const root=new URL('../src/',import.meta.url);
  const main=await fs.readFile(new URL('main.js',root),'utf8');
  const voyage=await fs.readFile(new URL('ui/FirstVoyageGuide.js',root),'utf8');
  assert.doesNotMatch(main,/chase-supply-arrow">⬇/);
  assert.doesNotMatch(main,/thief-guide-arrow">➤/);
  assert.doesNotMatch(voyage,/voyage-arrow-symbol">➤/);
  assert.match(main,/createGuidedPointerImage\('chase-supply-pointer'\)/);
  assert.match(main,/angleToGuidedTarget\(\{/);
});
