import test from 'node:test';
import assert from 'node:assert/strict';
import { NavalBattleController } from '../src/combat/NavalBattleController.js';
function harness(){
 let save={consumables:{selectedId:'flame-5x',quantities:{'flame-5x':10,shield:10}},combat:{shipHealth:100},equipment:{loadout:{starter:['blue-gold-pirate']}},ammunition:{'rusted-iron':20},missions:{corsair:'active'}};
 const player={x:100,y:100,heading:0};const enemy={id:'e',type:'npc',archetype:'red-sail-corsair',x:200,y:100,health:100,maxHealth:100};
 const renderer={prepareAmmo(){},fire(){return true}};
 const battle=new NavalBattleController({renderer,shipId:'starter',readSave:()=>save,writePatch:p=>{save={...save,...p}},getPlayer:()=>player,getEntities:()=>new Map([[enemy.id,enemy]])});
 return {battle,player,enemy,get save(){return save}};
}
test('escudo e 5X podem permanecer ativos juntos sem redefinir cooldown',()=>{
 const t=harness(), c=t.battle;
 assert.equal(c.activateConsumable().ok,true);
 const flameUntil=t.save.consumables.activeUntil;
 c.selectConsumable('shield');
 assert.equal(c.activateConsumable().ok,true);
 assert.equal(c.isFlameActive(),true);
 assert.equal(c.isShieldActive(),true);
 assert.equal(t.save.consumables.activeUntil,flameUntil);
 assert.ok(t.save.consumables.shieldCooldownUntil > Date.now()+179000);
 assert.equal(t.save.consumables.quantities.shield,9);
 assert.equal(t.save.consumables.quantities['flame-5x'],9);
 assert.equal(c.resolveNpcImpact('e',{x:100,y:100},15).kind,'ship');
 assert.equal(c.getHealth(),100);
});
test('consumível não pode ser ativado duas vezes durante o cooldown persistido',()=>{
 const t=harness(),c=t.battle;
 assert.equal(c.activateConsumable().ok,true);
 c.selectConsumable('none');
 c.selectConsumable('flame-5x');
 assert.equal(c.activateConsumable().ok,false);
 assert.ok(t.save.consumables.cooldownUntil > Date.now()+299000);
});
