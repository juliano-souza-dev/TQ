import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chooseRegionChallenge,recordRegionChallenge,REGION_FAMILIES } from '../src/education/RegionMastery.js';
import { resolvePedagogicalAction } from '../src/gameplay/PedagogicalActions.js';

function masteredRegion(region){
 const families={};
 for(const family of REGION_FAMILIES[region]){
  const byFactor={};
  for(let factor=1;factor<=10;factor++)
   byFactor[factor]={attempts:1,correctFirstTry:1};
  families[family]={byFactor};
 }
 return {['region'+region]:{families,answeredIds:[]}};
}
test('mastered regions always choose a curriculum-valid multiplication for repair',()=>{
 for(const region of [1,2,3,4,5,6,7,8,9,10,11,12]){
  const progress=masteredRegion(region);
  const challenge=chooseRegionChallenge(progress,null,()=>0,region);
  assert.ok(REGION_FAMILIES[region].includes(challenge.family),
   'region '+region+' must not emit a multiplication from another curriculum');
  const recorded=recordRegionChallenge(progress,challenge,true);
  assert.equal(recorded.recorded,true,'repair study must accept the valid family in region '+region);
 }
});
test('R3 3×4 succeeds when every regional family has been mastered',()=>{
 const progress=masteredRegion(3);
 const challenge=chooseRegionChallenge(progress,null,()=>0,3);
 const save={pedagogy:progress,equipment:{equippedShipId:'fantasma-esmeralda'},
  fleetCampaign:{version:1,region:3},combat:{shipHealth:1920}};
 const result=resolvePedagogicalAction(save,{kind:'repair'},challenge,true);
 assert.ok(result,'correct repair math cannot become unavailable after mastery');
 assert.match(result.message,/Reparação iniciada/);
 assert.equal(result.patch.combat.repairingFrom,1920);
 assert.equal(result.patch.pedagogy.region3.answeredIds.at(-1),challenge.id);
});
test('the initial game loop does not force-open or replace repair challenges',()=>{
 const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/beginRepairSession\(true\)/);
 assert.doesNotMatch(src,/mathGate\.close\(true\);\s*beginRepairSession/);
 assert.match(src,/onRepair:\s*\(\)\s*=>\s*beginRepairSession\(\)/);
});
