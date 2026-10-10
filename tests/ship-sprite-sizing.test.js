import test from 'node:test';
import assert from 'node:assert/strict';
import { playerShipPixelSize, ShipRenderer } from '../src/rendering/ShipRenderer.js';
import { npcShipPixelSize } from '../src/rendering/NpcRenderer.js';
import { STARTER_SHIP } from '../src/ships/StarterShip.js';

const near=(actual, expected, tolerance=1)=>assert.ok(
  Math.abs(actual-expected)<=tolerance,
  `expected ${actual.toFixed(3)} to be within ${tolerance} of ${expected}`,
);

test('desktop ship scale fits gameplay without giant hulls at normal zoom',()=>{
  near(playerShipPixelSize(1440,740,1,.88),135);
  near(npcShipPixelSize(1440,740,1,.88),110);
  near(npcShipPixelSize(1440,740,1,.88,{merchant:true}),126.5);
});

test('mobile ship scale stays compact, including Silas Rubro',()=>{
  near(playerShipPixelSize(390,800,1,.88),95);
  near(npcShipPixelSize(390,800,1,.88),82.72);
  near(npcShipPixelSize(390,800,1,.88,{merchant:true}),95.13);
  assert.ok(playerShipPixelSize(320,640,1,.88)<95);
});

test('DPR does not enlarge CSS pixel ship sizes and zoom remains dynamic',()=>{
  for(const [width,height] of [[1440,740],[390,800]]){
    const one=playerShipPixelSize(width,height,1,.88);
    const two=playerShipPixelSize(width*2,height*2,2,.88);
    near(two/2,one,.001);
    near(npcShipPixelSize(width*2,height*2,2,.88)/2,npcShipPixelSize(width,height,1,.88),.001);
    near(playerShipPixelSize(width,height,1,.44),one/2,.001);
  }
});

test('sprite world size uses the same visual scale as rendering and cannon hardpoints',()=>{
  const renderer=Object.create(ShipRenderer.prototype);
  renderer.canvas={getBoundingClientRect:()=>({width:1440,height:740})};
  renderer.definition=STARTER_SHIP;
  renderer.image={naturalWidth:1600,naturalHeight:1600};
  const originalWindow=globalThis.window;
  globalThis.window={devicePixelRatio:1};
  try{
    const zoom=.88;
    const frame=renderer.getFrameWorldSize(zoom);
    near(frame.width*zoom,playerShipPixelSize(1440,740,1,zoom),.001);
    near(frame.height*zoom,playerShipPixelSize(1440,740,1,zoom),.001);
  }finally{
    if(originalWindow===undefined)delete globalThis.window;
    else globalThis.window=originalWindow;
  }
});
