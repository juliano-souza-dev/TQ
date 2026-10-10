import { R2 } from '../src/world/regions/r2.js';
import { collidesWithIsland, getIslandContact } from '../src/world/IslandCollision.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getR2Board, acceptR2Mission, recordR2Event, claimR2Mission, advanceR2Story, R2_MISSIONS } from '../src/missions/RegionTwoCampaign.js';
import { R2_TREASURES, getVisibleTreasures } from '../src/treasures/RegionTreasures.js';

test('campanha da segunda região tem onze missões sequenciais', () => {
  let save = { profile:{gold:0} };
  assert.equal(R2_MISSIONS.length, 25);
  for (const mission of R2_MISSIONS) {
    const accepted = acceptR2Mission(save, mission.id);
    assert.ok(accepted);
    save = { ...save, ...accepted };
    for (const task of mission.objectives) {
      for (let i=0; i<task.count; i++) {
        const event = recordR2Event(save, {type:task.kind,id:mission.id+':'+task.kind+':'+i,ship:task.ship});
        assert.ok(event);
        save = { ...save, ...event };
      }
    }
    assert.equal(getR2Board(save).claimable[0].id,mission.id);
    const outcome = claimR2Mission(save,mission.id);
    assert.ok(outcome);
    save = { ...save, ...outcome.patch };
    assert.equal(claimR2Mission(save,mission.id),null);
  }
  assert.equal(getR2Board(save).essentialClaimed,25);
  assert.ok(save.equipment?.ownedShipIds?.includes('fragata-sombra-cacadora'));
  assert.equal(save.equipment?.cannonCounts?.['aetherion-mk1'],1);
  assert.equal(save.ammunition?.['aetherion-seeker'],5000);
});
test('arcas da Costa dos Corsários aparecem somente na segunda região',()=>{
  assert.ok(R2_TREASURES.length>=20);
  assert.ok(getVisibleTreasures({},0,'r2').every(t=>t.id.startsWith('r2-')));
});

test('travessia chega fora da zona de contato de qualquer porto na R2',()=>{
  assert.equal(collidesWithIsland(R2,R2.spawn.x,R2.spawn.y,32),false);
  assert.equal(getIslandContact(R2,R2.spawn.x,R2.spawn.y,100),null);
});


test('equipar o Terror da Tabuada vem antes do encontro na Ilha Esquecida', () => {
  const equipIndex=R2_MISSIONS.findIndex(m=>m.id==='r2-equip-terror');
  const meetingIndex=R2_MISSIONS.findIndex(m=>m.id==='r2-meet-forgotten');
  assert.ok(equipIndex>=0);
  assert.equal(meetingIndex,equipIndex+1);
  assert.equal(R2_MISSIONS[equipIndex].objectives[0].kind,'equip-ship');
  assert.equal(R2_MISSIONS[equipIndex].objectives[0].ship,'galeao-halloween-tabuada');

  const golden=R2_MISSIONS.find(m=>m.id==='r2-golden-ii');
  assert.ok(golden.reward.ships.includes('galeao-halloween-tabuada'));
});

test('missão guiada do Terror só libera o encontro depois de equipar e resgatar', () => {
  const previous=R2_MISSIONS[R2_MISSIONS.findIndex(m=>m.id==='r2-equip-terror')-1];
  let save={
    profile:{gold:0},
    r2Campaign:{active:null,claimed:[previous.id],progress:{},processed:[]},
    equipment:{ownedShipIds:['galeao-halloween-tabuada']},
  };
  const accepted=acceptR2Mission(save,'r2-equip-terror');
  assert.ok(accepted);
  save={...save,...accepted};
  const progress=recordR2Event(save,{
    type:'equip-ship',ship:'galeao-halloween-tabuada',id:'guided-terror-equip'
  });
  assert.ok(progress);
  save={...save,...progress};
  assert.equal(getR2Board(save).claimable[0]?.id,'r2-equip-terror');
  const outcome=claimR2Mission(save,'r2-equip-terror');
  assert.ok(outcome);
  save={...save,...outcome.patch};
  assert.equal(getR2Board(save).available[0]?.id,'r2-meet-forgotten');
});


test('chegar ao Estaleiro equipa automaticamente o Terror da Tabuada durante a missão guiada', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /async function autoEquipTerrorAtShipyard\(\)/);
  assert.match(source, /active==='r2-equip-terror'/);
  assert.match(source, /equippedShipId:ship\.id/);
  assert.match(source, /recordMissionEvent\(\{type:'equip-ship',ship:ship\.id,id:'terror-auto-equipped'\}\)/);
  assert.match(source, /guideMissionTo\('missions'\)/);
});


test('save pós-emboscada não volta para o Galeão Dourado nem Mercado Negro', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /postAmbushProgress=save\.storyFlags\?\.pumpkinAmbushResolved===true/);
  assert.match(source, /save\.storyFlags\?\.pumpkinAmbushResolved!==true/);
  assert.match(source, /postAmbushCampaignRepairV1/);
  assert.match(source, /active:'r2-search-clues'/);
  assert.match(source, /'r2-why-help'/);
});


test('missão R2 concluída traça rota automática para o Porto das Missões', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /function routeToMissionsPort\(/);
  assert.match(source, /clickNavigation\?\.setDestination\(destination\)/);
  assert.match(source, /void guideMissionTo\('missions'\)/);
  assert.match(source, /routeToMissionsPort\(\{announce:false\}\)/);
  assert.match(source, /const readyAtLoad=/);
});


test('estado contraditório active + claimed é resolvido pelo motor, sem normalizador runtime', async () => {
  const save={r2Campaign:{active:'r2-thieves',claimed:['r2-thieves','r2-thieves'],progress:{'r2-thieves':[20,5]},processed:[]}};
  const board=getR2Board(save);
  const mission=board.missions.find(m=>m.id==='r2-thieves');
  assert.equal(mission.status,'claimed');
  assert.equal(mission.active,false);
  assert.equal(board.active.length,0);
  assert.equal(board.essentialClaimed,1);
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /An active contract can never also be marked as claimed/);
});

test('transição narrativa R2 conclui exatamente uma missão e inicia somente a próxima', () => {
  const before=R2_MISSIONS.findIndex(m=>m.id==='r2-meet-forgotten');
  const save={r2Campaign:{active:'r2-meet-forgotten',claimed:R2_MISSIONS.slice(0,before).map(m=>m.id),progress:{'r2-meet-forgotten':[0]},processed:[]}};
  const patch=advanceR2Story(save,'r2-meet-forgotten','r2-why-help');
  assert.ok(patch);
  assert.equal(patch.r2Campaign.active,'r2-why-help');
  assert.ok(patch.r2Campaign.claimed.includes('r2-meet-forgotten'));
  assert.deepEqual(patch.r2Campaign.progress['r2-meet-forgotten'],[1]);
  assert.deepEqual(patch.r2Campaign.progress['r2-why-help'],[0]);
});

test('deduplicação de evento R2 é escopada pela missão ativa', () => {
  const first={r2Campaign:{active:'r2-thieves',claimed:[],progress:{'r2-thieves':[0,0]},processed:[]}};
  const p1=recordR2Event(first,{type:'defeat',id:'same-npc'});
  assert.ok(p1);
  assert.match(p1.r2Campaign.processed[0],/^r2-thieves:defeat:/);
});
