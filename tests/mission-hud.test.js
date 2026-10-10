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
  assert.equal(formatMissionHudObjectives(mission),'Coletar 5 tesouros · 0/5 · Afundar 3 NPCs · 3/3');
  assert.equal(formatMissionHudObjectives(mission).includes(mission.name),false);
});


test('HUD explicita o alvo literal em vez de reduzir tudo para NPC', () => {
  const mission={
    objectives:[{kind:'defeat',archetype:'sea-monster-kraken',count:1,label:'Derrotar 1 Kraken das Profundezas'}],
    progress:[0],
  };
  assert.equal(formatMissionHudObjectives(mission),'Derrotar 1 Kraken das Profundezas · 0/1');
  assert.equal(formatMissionHudObjectives(mission).includes('NPC'),false);
});
