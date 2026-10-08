import test from 'node:test';
import assert from 'node:assert/strict';
import { damageMonster, monsterHealthRatio, monsterBloodLevel } from '../src/monsters/MonsterCombat.js';
import { findNpcAtPoint } from '../src/npcs/NpcSelection.js';

const create = () => ({ id:'monster-1', type:'monster', x:100, y:100, health:100, maxHealth:100 });
test('sangra ao receber dano, sem afetar NPCs comuns', () => {
  const monster=create();
  assert.equal(damageMonster(monster,10,100)?.health,90);
  assert.ok(monsterBloodLevel(monster,200)>0);
  assert.equal(monsterBloodLevel(monster,1600),0);
  assert.equal(damageMonster({type:'npc',health:100},10,0),null);
});
test('intensidade sobe quando vida chega a 25% e permanece visível', () => {
  const monster=create();
  damageMonster(monster,74,100);
  assert.equal(monsterHealthRatio(monster),0.26);
  const normal=monsterBloodLevel(monster,100);
  damageMonster(monster,1,200);
  assert.equal(monsterHealthRatio(monster),0.25);
  assert.ok(monsterBloodLevel(monster,200)>normal*2);
  assert.ok(monsterBloodLevel(monster,3000)>0);
});
test('monstro derrotado não continua sangrando; dano inválido não produz efeito',()=>{
  const monster=create();
  assert.equal(damageMonster(monster,0,0),null);
  assert.equal(damageMonster(monster,-1,0),null);
  assert.equal(damageMonster(monster,200,0)?.defeated,true);
  assert.equal(monsterBloodLevel(monster,10),0);
});
test('seleção encontra monstro vivo sem selecionar monstros derrotados',()=>{
 const alive=create(),dead={...create(),id:'dead',health:0,x:99,y:100};
 assert.equal(findNpcAtPoint(new Map([[alive.id,alive],[dead.id,dead]]),100,100)?.id,'monster-1');
});
