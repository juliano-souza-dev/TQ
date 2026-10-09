import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignFor,boardFor,missionReady} from '../src/missions/CampaignEngine.js';

test('motor único resolve campanhas das duas regiões',()=>{
  assert.equal(typeof campaignFor('r1').board,'function');
  assert.equal(typeof campaignFor('r2').board,'function');
  assert.equal(boardFor({},'r2').missions.length,9);
});
test('R2 muda de em andamento para recompensa aguardando e depois resgatada',()=>{
  let save={r2Campaign:{active:null,claimed:[],progress:{},processed:[]}};
  const engine=campaignFor('r2');
  save={...save,...engine.accept(save,'r2-map')};
  assert.equal(save.r2Campaign.active,null);
  save={...save,...engine.accept(save,'r2-thieves')};
  assert.equal(boardFor(save,'r2').active[0].status,'active');
  for(let i=0;i<50;i++)save={...save,...engine.record(save,{type:'defeat',id:'corsair-'+i})};
  for(let i=0;i<20;i++)save={...save,...engine.record(save,{type:'treasure',id:'chest-'+i})};
  assert.equal(missionReady(save,'r2')?.id,'r2-thieves');
  const claimed=engine.claim(save,'r2-thieves');
  assert.ok(claimed);
  save={...save,...claimed.patch};
  assert.equal(missionReady(save,'r2'),null);
  assert.equal(boardFor(save,'r2').missions[0].status,'claimed');
});
