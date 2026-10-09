import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonsterPopulation, updateMonsterPopulation, monsterGoldReward, MONSTERS_PER_MAP } from '../src/monsters/MonsterPopulation.js';

import { resolveKrakenMovement } from '../src/world/NavigationSystem.js';

const world = () => ({
  region: {id:'r1',width:4096,height:4096,islands:[]},
  camera:{x:3400,y:3500},
  entities:new Map(),
});
test('cria exatamente dois monstros estacionários e sem colisão com NPCs',()=>{
 const w=world();
 createMonsterPopulation(w,()=>0.28);
 assert.equal([...w.entities.values()].filter(m=>m.type==='monster').length,MONSTERS_PER_MAP);
 const before=[...w.entities.values()].map(m=>[m.x,m.y]);
 updateMonsterPopulation(w,5000);
 assert.deepEqual([...w.entities.values()].map(m=>[m.x,m.y]),before);
});
test('respawn acontece apenas após sessenta segundos de morte',()=>{
 const w=world();createMonsterPopulation(w,()=>0.32);
 const m=w.entities.values().next().value;
 m.health=0;
 updateMonsterPopulation(w,1000);
 assert.equal(m.health,0);
 updateMonsterPopulation(w,59999);
 assert.equal(m.health,0);
 updateMonsterPopulation(w,1);
 assert.equal(m.health,1650);
 assert.equal(m.maxHealth,1650);
 assert.equal(m.state,'idle');
});
test('recompensa aleatória fica dentro do intervalo configurado',()=>{
 assert.equal(monsterGoldReward(()=>0),20);
 assert.equal(monsterGoldReward(()=>0.999999),80);
});

test('Kraken impede atravessar o corpo, mas permite afastar-se e passar após derrota', () => {
  const w=world();
  w.entities.set('kraken',{id:'kraken',type:'monster',health:1500,x:200,y:200});
  const stopped=resolveKrakenMovement(w,50,200,380,200);
  assert.ok(Math.hypot(stopped.x-200,stopped.y-200)>=125);
  assert.ok(stopped.x<200,'movimento não atravessa o monstro');
  const escaping=resolveKrakenMovement(w,200,200,100,200);
  assert.equal(escaping.x,100,'é possível escapar quando já há sobreposição');
  w.entities.get('kraken').health=0;
  assert.deepEqual(resolveKrakenMovement(w,50,200,380,200),{x:380,y:200});
});
