import test from 'node:test';
import assert from 'node:assert/strict';
import { createMonsterPopulation, updateMonsterPopulation, monsterGoldReward, MONSTERS_PER_MAP } from '../src/monsters/MonsterPopulation.js';

const world = () => ({
  region: {id:'r1',width:4096,height:4096,islands:[]},
  camera:{x:3400,y:3500},
  entities:new Map(),
});
test('cria exatamente dez monstros estacionários e sem colisão com NPCs',()=>{
 const w=world();
 createMonsterPopulation(w,()=>0.28);
 assert.equal([...w.entities.values()].filter(m=>m.type==='monster').length,MONSTERS_PER_MAP);
 const before=[...w.entities.values()].map(m=>[m.x,m.y]);
 updateMonsterPopulation(w,5000);
 assert.deepEqual([...w.entities.values()].map(m=>[m.x,m.y]),before);
});
test('respawn acontece apenas após quinze segundos de morte',()=>{
 const w=world();createMonsterPopulation(w,()=>0.32);
 const m=w.entities.values().next().value;
 m.health=0;
 updateMonsterPopulation(w,1000);
 assert.equal(m.health,0);
 updateMonsterPopulation(w,14999);
 assert.equal(m.health,0);
 updateMonsterPopulation(w,1);
 assert.equal(m.health,m.maxHealth);
 assert.equal(m.state,'idle');
});
test('recompensa aleatória fica dentro do intervalo configurado',()=>{
 assert.equal(monsterGoldReward(()=>0),20);
 assert.equal(monsterGoldReward(()=>0.999999),80);
});
