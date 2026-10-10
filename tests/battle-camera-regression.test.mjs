import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOneVsOneFraming } from '../src/world/BattleCamera.js';

test('combat framing expands as target moves away from the player',()=>{
  const player={x:2000,y:2000};
  const close=computeOneVsOneFraming({player,target:{x:2110,y:2000},viewportWidth:900,viewportHeight:600});
  const distant=computeOneVsOneFraming({player,target:{x:2800,y:2000},viewportWidth:900,viewportHeight:600});
  assert.ok(close.zoom>distant.zoom,`close=${close.zoom}, distant=${distant.zoom}`);
  assert.ok(close.zoom>.88,'close combat must visibly zoom toward the duel');
  assert.ok(distant.zoom<.8,'distant combat must show more of the sea');
});

test('missing minimum zoom override does not turn into 0.08',()=>{
  const framing=computeOneVsOneFraming({
    player:{x:2000,y:2000},target:{x:3800,y:2000},
    viewportWidth:900,viewportHeight:600,normalZoom:.88,
  });
  assert.ok(framing.zoom>=.24,`default min zoom should be .24, got ${framing.zoom}`);
});

test('manual override still permits extra-wide cinematic shot',()=>{
  const player={x:2500,y:2500},target={x:3700,y:2500};
  const regular=computeOneVsOneFraming({player,target,viewportWidth:900,viewportHeight:600});
  const cinematic=computeOneVsOneFraming({player,target,viewportWidth:900,viewportHeight:600,minZoomOverride:.12});
  assert.ok(cinematic.zoom<=regular.zoom);
});
