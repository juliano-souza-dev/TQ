import test from 'node:test';
import assert from 'node:assert/strict';
import {detectLayoutMode,createLayoutMode} from '../src/ui/LayoutMode.js';
import {isWithinFireDeadZone} from '../src/world/ClickNavigationInput.js';
test('viewport mode keeps desktop intact',()=>{
  assert.equal(detectLayoutMode({width:360,coarse:false,portrait:true}),'mobile-portrait');
  assert.equal(detectLayoutMode({width:390,coarse:true,portrait:true}),'mobile-portrait');
  assert.equal(detectLayoutMode({width:932,coarse:true,portrait:false}),'mobile-landscape');
  assert.equal(detectLayoutMode({width:1280,coarse:false,portrait:true}),'desktop');
});
test('24px halo blocks near misses but keeps ocean touches outside',()=>{
  const rect={left:138,top:620,right:222,bottom:704};
  assert.equal(isWithinFireDeadZone(120,630,rect),true);
  assert.equal(isWithinFireDeadZone(180,596,rect),true);
  assert.equal(isWithinFireDeadZone(113,630,rect),false);
  assert.equal(isWithinFireDeadZone(180,595,rect),false);
  assert.equal(isWithinFireDeadZone(180,706,null),false);
});
test('rotating changes layout without rebuilding the game',()=>{
  const handlers=new Map(),dataset={};
  const win={innerWidth:390,innerHeight:844,document:{documentElement:{dataset}},
    screen:{orientation:{type:'portrait-primary',addEventListener(){},removeEventListener(){}}},
    addEventListener(k,fn){handlers.set(k,fn);},removeEventListener(k){handlers.delete(k);},
    matchMedia(q){return {matches:q.includes('pointer: coarse'),addEventListener(){},removeEventListener(){}};}};
  const mode=createLayoutMode(win),seen=[];const off=mode.subscribe(x=>seen.push(x));
  win.innerWidth=844;win.innerHeight=390;win.screen.orientation.type='landscape-primary';
  handlers.get('orientationchange')();
  assert.equal(mode.value,'mobile-landscape');
  assert.equal(dataset.tqLayout,'mobile-landscape');
  assert.deepEqual(seen,['mobile-portrait','mobile-landscape']);
  off();mode.dispose();
});

test('reload ring observes the actual harpoon timer without changing gameplay state',async()=>{
  const {NavalBattleController}=await import('../src/combat/NavalBattleController.js');
  const save={},battle=Object.create(NavalBattleController.prototype);
  battle.firing=true;battle.getTarget=()=>({type:'monster'});
  battle.readSave=()=>save;battle.nextHarpoonAt=4500;
  const result=battle.getPlayerReloadState(1000);
  assert.deepEqual(result,{remainingMs:3500,durationMs:3500});
  assert.equal(battle.nextHarpoonAt,4500);
  assert.deepEqual(save,{});
  battle.firing=false;
  assert.deepEqual(battle.getPlayerReloadState(1000),{remainingMs:0,durationMs:0});
});
