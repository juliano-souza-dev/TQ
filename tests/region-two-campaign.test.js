import { R2 } from '../src/world/regions/r2.js';
import { collidesWithIsland, getIslandContact } from '../src/world/IslandCollision.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getR2Board, acceptR2Mission, recordR2Event, claimR2Mission, R2_MISSIONS } from '../src/missions/RegionTwoCampaign.js';
import { R2_TREASURES, getVisibleTreasures } from '../src/treasures/RegionTreasures.js';

test('campanha da segunda região tem onze missões sequenciais', () => {
  let save = { profile:{gold:0} };
  assert.equal(R2_MISSIONS.length, 11);
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
  assert.equal(getR2Board(save).essentialClaimed,11);
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
  assert.match(source, /guideR2MissionTo\('missions'\)/);
});


test('save pós-emboscada não volta para o Galeão Dourado nem Mercado Negro', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /postAmbushProgress=save\.storyFlags\?\.pumpkinAmbushResolved===true/);
  assert.match(source, /save\.storyFlags\?\.pumpkinAmbushResolved!==true/);
  assert.match(source, /postAmbushCampaignRepairV1/);
  assert.match(source, /active:'r2-search-clues'/);
  assert.match(source, /'r2-why-help'/);
});
