import test from 'node:test';
import assert from 'node:assert/strict';
import { getR2Board, acceptR2Mission, recordR2Event, claimR2Mission, R2_MISSIONS } from '../src/missions/RegionTwoCampaign.js';
import { R2_TREASURES, getVisibleTreasures } from '../src/treasures/RegionTreasures.js';

test('campanha da segunda região tem cinco missões sequenciais', () => {
  let save = { profile:{gold:0} };
  assert.equal(R2_MISSIONS.length, 5);
  for (const mission of R2_MISSIONS) {
    const accepted = acceptR2Mission(save, mission.id);
    assert.ok(accepted);
    save = { ...save, ...accepted };
    for (const task of mission.objectives) {
      for (let i=0; i<task.count; i++) {
        const event = recordR2Event(save, {type:task.kind,id:mission.id+':'+task.kind+':'+i});
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
  assert.equal(getR2Board(save).essentialClaimed,6);
});
test('arcas da Costa dos Corsários aparecem somente na segunda região',()=>{
  assert.ok(R2_TREASURES.length>=20);
  assert.ok(getVisibleTreasures({},0,'r2').every(t=>t.id.startsWith('r2-')));
});
