import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMissionHudObjectives } from '../src/ui/MissionHud.js';

test('HUD de missão mostra objetivos concretos e não o nome abstrato da missão', () => {
  const mission = {
    name:'Fortaleça o Navio',
    objectives:[
      {kind:'treasure',count:5,label:'Coletar 5 tesouros'},
      {kind:'defeat',count:3,label:'Afundar 3 NPCs'},
    ],
    progress:[0,3],
  };
  assert.equal(formatMissionHudObjectives(mission),'Tesouro 0/5 · NPC 3/3');
  assert.equal(formatMissionHudObjectives(mission).includes(mission.name),false);
});
