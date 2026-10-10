import test from 'node:test';
import assert from 'node:assert/strict';
import { NavalBattleController, KRAKEN_RETALIATION_RANGE } from '../src/combat/NavalBattleController.js';
import { NavalCombatWebGLRenderer } from '../src/rendering/NavalCombatWebGLRenderer.mjs';
import { effectiveAmmo, cannonHardpoint, interceptPoint } from '../src/combat/NavalBattleRules.js';

function battleHarness({ renderAccepted = true, mission = 'active', ammoCount = 20 } = {}) {
  let save = {
    missions: { corsair: mission },
    equipment: { loadout: { starter: ['blue-gold-pirate'] } },
    ammunition: { 'rusted-iron': ammoCount },
    harpoonAmmo: {'harpoon-mariner':500},
    combat: { shipHealth: 100 },
  };
  const enemy = {
    id: 'npc-1', type: 'npc', name: 'Corsário das Velas Rubras',
    archetype: 'red-sail-corsair',
    x: 320, y: 100, heading: 270, health: 25, maxHealth: 25, state: 'idle',
  };
  const player = { x: 100, y: 100, heading: 90 };
  const shots = [], messages = [], victories = [];
  let now = 1000;
  const renderer = {
    prepareAmmo() {},
    fire(shot) { if (!renderAccepted) return false; shots.push(shot); return true; },
    render() {},
    destroy() {},
  };
  const battle = new NavalBattleController({
    renderer, shipId: 'starter', readSave: () => save,
    writePatch: patch => { save = { ...save, ...patch }; },
    getPlayer: () => player,
    getEntities: () => new Map([[enemy.id, enemy]]),
    onFeedback: message => messages.push(message),
    onVictory: npc => victories.push(npc.id),
    random: () => .5, clock: () => now,
  });
  battle.setTarget(enemy.id);
  return {
    battle, renderer, player, enemy, shots, messages, victories,
    get save() { return save; },
    set time(value) { now = value; },
  };
}

test('mission and equipped cannon gate target acquisition', () => {
  const locked = battleHarness({ mission: 'complete' });
  assert.equal(locked.battle.getStatus().reason, 'mission');
  assert.equal(locked.battle.toggleFire(), false);
  assert.equal(locked.shots.length, 0);
  const empty = battleHarness({ ammoCount: 0 });
  assert.equal(empty.battle.getStatus().reason, 'ammo');
  assert.equal(empty.battle.toggleFire(), false);
  assert.equal(empty.shots.length, 0);
});

test('one cannon launches one flight, debits precisely one round and respects reload', () => {
  const t = battleHarness();
  assert.equal(t.battle.getStatus().ready, true);
  assert.equal(t.battle.toggleFire(), true);
  assert.equal(t.shots.length, 1);
  assert.equal(t.save.ammunition['rusted-iron'], 19);
  assert.equal(t.enemy.health, 25, 'damage must wait until the projectile arrives');
  t.time = 1500;
  t.battle.update(16, 1500);
  assert.equal(t.shots.length, 1, 'must respect cannon cooldown');
  t.time = 2300;
  t.battle.update(16, 2300);
  assert.equal(t.shots.length, 2);
  assert.equal(t.save.ammunition['rusted-iron'], 18);
  t.battle.toggleFire();
  t.time = 4000;
  t.battle.update(16, 4000);
  assert.equal(t.shots.length, 2, 'stop means stop creating new shots');
});

test('only a hull impact causes damage and allows NPC retaliation', () => {
  const t = battleHarness();
  t.battle.toggleFire();
  const shot = t.shots[0];
  assert.equal(shot.onImpact({ at: shot.to }).kind, 'ship');
  assert.equal(t.enemy.health, 15);
  assert.equal(t.enemy.state, 'retaliating');
  assert.match(t.messages.at(-1), /Acertou/);
});

test('a moving target causes a genuine splash instead of invisible damage', () => {
  const t = battleHarness();
  t.battle.toggleFire();
  t.enemy.x += 700;
  const shot = t.shots[0];
  assert.equal(shot.onImpact({ at: shot.to }).kind, 'water');
  assert.equal(t.enemy.health, 25);
});

test('a rejected WebGL shot never consumes ammunition', () => {
  const t = battleHarness({ renderAccepted: false });
  t.battle.toggleFire();
  assert.equal(t.shots.length, 0);
  assert.equal(t.save.ammunition['rusted-iron'], 20);
  assert.equal(t.battle.firing, false);
  assert.match(t.messages.at(-1), /preservada/);
});

test('the old combat renderer draws a flying cannonball and fires one impact callback', () => {
  const originalImage = globalThis.Image;
  try {
    let drawCalls = 0;
    const gl = new Proxy({
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getAttribLocation: () => 0,
      getUniformLocation: () => ({}),
      getParameter: () => [1, 256],
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      createTexture: () => ({}),
      drawArrays: () => { drawCalls++; },
    }, {
      get(obj, key) {
        if (key in obj) return obj[key];
        if (typeof key === 'string' && key.toUpperCase() === key) return key;
        return () => {};
      },
    });
    const canvas = {
      style: {}, width: 0, height: 0,
      getContext: name => name === 'webgl2' ? gl : null,
    };
    globalThis.Image = class {
      set src(value) { this.url = value; this.onload?.(); }
    };
    const renderer = new NavalCombatWebGLRenderer(canvas);
    assert.equal(renderer.init(), true);
    const ammo = effectiveAmmo('rusted-iron');
    let impacts = 0;
    assert.equal(renderer.fire({
      from: { x: 0, y: 0 }, to: { x: 200, y: 0 },
      ammo, duration: 800, startTime: 1000, impactKind: 'water',
      onImpact: () => { impacts++; return { kind: 'ship' }; },
    }), true);
    renderer.render({ time: 1300, camera: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 });
    assert.ok(drawCalls > 0, 'WebGL drawArrays must draw the traveling projectile');
    assert.equal(impacts, 0);
    renderer.render({ time: 1810, camera: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 });
    assert.equal(impacts, 1);
    assert.ok(renderer.impacts.some(impact => impact.kind === 'ship'));
    renderer.render({ time: 1850, camera: { x: 0, y: 0 }, zoom: 1, width: 800, height: 600 });
    assert.equal(impacts, 1, 'impact callback must never repeat');
    renderer.destroy();
  } finally {
    if (originalImage === undefined) delete globalThis.Image;
    else globalThis.Image = originalImage;
  }
});

test('projectile origin follows the equipped cannon side; interception accounts for velocity', () => {
  const right = cannonHardpoint({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 0, 1);
  const left = cannonHardpoint({ x: 0, y: 0 }, { x: -100, y: 0 }, 0, 0, 1);
  assert.ok(right.x > 0 && left.x < 0);
  const predicted = interceptPoint({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 30, y: 0 }, 420);
  assert.ok(predicted.x > 200, 'must lead moving ship, not aim behind it');
});

test('retaliating NPC launches a projectile and damage persists on the hull', () => {
  const t = battleHarness();
  t.battle.toggleFire();
  const initialShot = t.shots[0];
  initialShot.onImpact({ at: initialShot.to });
  t.time = 1300;
  t.battle.update(16, 1300);
  const returnShot = t.shots.find(shot => shot !== initialShot);
  assert.ok(returnShot, 'retaliation must be a genuine projectile');
  assert.equal(returnShot.onImpact({ at: returnShot.to }).kind, 'ship');
  assert.equal(t.save.combat.shipHealth, 95);
});

test('Halloween event ammunition is separate from normal cannonball inventory', () => {
  const t = battleHarness();
  t.save.ammunition['halloween-purple-ball'] = 24;
  assert.equal(t.battle.setAmmo('halloween-purple-ball'), true);
  assert.equal(t.battle.toggleFire(), true);
  assert.equal(t.save.ammunition['halloween-purple-ball'], 23);
  assert.equal(t.save.ammunition['rusted-iron'], 20);
  assert.equal(t.shots[0].ammo.fx.preset, 'halloween');
});

test('NPC configurado usa alcance e dano próprios no disparo', () => {
  const t = battleHarness();
  t.enemy.x = 500;
  t.enemy.state = 'retaliating';
  t.enemy.aggression = 'attack';
  t.enemy.cannonSlots = 10;
  t.enemy.range = 520;
  t.enemy.damage = 12;
  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length, 1, 'alcance configurado deve permitir a salva');
  assert.equal(t.shots[0].onImpact({at:t.shots[0].to}).kind, 'ship');
  assert.equal(t.save.combat.shipHealth, 88);
});

test('fragata em fuga nao atira, inclusive quando recebe dano', () => {
  const t = battleHarness();
  t.enemy.archetype = 'fugitive-frigate';
  t.enemy.aggression = 'flee';
  t.enemy.cannonSlots = 0;
  t.battle.toggleFire();
  const shot = t.shots[0];
  assert.equal(shot.onImpact({ at: shot.to }).kind, 'ship');
  assert.equal(t.enemy.state, 'fleeing');
  t.battle.toggleFire();
  t.enemy.state = 'retaliating'; // Mesmo um estado herdado nao libera canhoes inexistentes.
  t.time = 2000;
  t.battle.update(16, 2000);
  assert.equal(t.shots.length, 1);
});

test('mira automatica prioriza menor vida dentro do alcance real', () => {
  const t = battleHarness();
  const close = { ...t.enemy, id:'close', x:180, health:20 };
  const weak = { ...t.enemy, id:'weak', x:240, health:5 };
  const far = { ...t.enemy, id:'far', x:4000, health:1 };
  t.battle.getEntities = () => new Map([[close.id,close],[weak.id,weak],[far.id,far]]);
  t.battle.setTarget(null);
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,'weak');
  weak.health = 0;
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,'close');
  close.x = 4000;
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,null);
});

test('mira automatica desempata por distancia e respeita selecao manual ate sair do alcance', () => {
  const t = battleHarness();
  const close = { ...t.enemy, id:'close', x:160, health:10 };
  const far = { ...t.enemy, id:'far', x:240, health:10 };
  t.battle.getEntities = () => new Map([[far.id,far],[close.id,close]]);
  t.battle.setTarget(null);
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,'close');
  t.battle.setTarget('far',{manual:true});
  close.health = 1;
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,'far');
  far.x = 5000;
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,'close');
});

test('mira nao adquire alvo quando nenhum canhao esta equipado', () => {
  const t = battleHarness();
  t.save.equipment.loadout.starter = [];
  t.battle.setTarget(null);
  t.battle.updateAutoTarget(160);
  assert.equal(t.battle.targetId,null);
});

test('three equipped cannons fire as a visible sequence instead of a clump', () => {
  const t = battleHarness({ ammoCount: 20 });
  t.save.equipment.loadout.starter = ['blue-gold-pirate','blue-gold-pirate','blue-gold-pirate'];
  assert.equal(t.battle.toggleFire(), true);
  assert.equal(t.shots.length, 1);
  assert.equal(t.save.ammunition['rusted-iron'], 19);

  t.time = 1159;
  t.battle.update(16, 1159);
  assert.equal(t.shots.length, 1, 'second cannon must wait for the sequence gap');

  t.time = 1160;
  t.battle.update(16, 1160);
  assert.equal(t.shots.length, 2);
  assert.equal(t.save.ammunition['rusted-iron'], 18);

  t.time = 1320;
  t.battle.update(16, 1320);
  assert.equal(t.shots.length, 3);
  assert.equal(t.save.ammunition['rusted-iron'], 17);
});

test('multiple cannons use remaining ammo only and never create free shots', () => {
  const t = battleHarness({ ammoCount: 2 });
  t.save.equipment.loadout.starter = ['blue-gold-pirate','blue-gold-pirate','blue-gold-pirate'];
  assert.equal(t.battle.toggleFire(), true);
  assert.equal(t.shots.length, 1);
  assert.equal(t.save.ammunition['rusted-iron'], 1);
  t.time = 1160;
  t.battle.update(16, 1160);
  assert.equal(t.shots.length, 2);
  assert.equal(t.save.ammunition['rusted-iron'], 0);
  t.time = 1320;
  t.battle.update(16, 1320);
  assert.equal(t.shots.length, 2, 'third cannon cannot create free ammunition');
});

test('Kraken submerso ignora arpão e volta a receber dano ao emergir', () => {
  let time=1000;
  const monster={ id:'kraken',type:'monster',health:1650,maxHealth:1650,x:20,y:20 };
  const attacks=[{monsterId:'kraken',startTime:1000,duration:1720}];
  const feedback=[];
  const controller=new NavalBattleController({
    renderer:{prepareAmmo(){},getKrakenAttacks:()=>attacks,destroy(){}},
    shipId:'starter',readSave:()=>({combat:{shipHealth:100}}),writePatch(){},
    getPlayer:()=>({x:0,y:0}),getEntities:()=>new Map([['kraken',monster]]),
    onFeedback:value=>feedback.push(value),clock:()=>time,
  });
  time=1400;
  assert.equal(controller.resolveHarpoonImpact('kraken',{x:20,y:20},50).kind,'water');
  assert.equal(monster.health,1650);
  assert.equal(feedback.length,0);
  time=2800;
  assert.equal(controller.resolveHarpoonImpact('kraken',{x:20,y:20},50).kind,'ship');
  assert.equal(monster.health,1600);
});

test('Kraken só revida depois de ser atingido e respeita o menor alcance de canhão', () => {
  assert.equal(KRAKEN_RETALIATION_RANGE, 595);
  let time=1000;
  const monster={id:'kraken',type:'monster',name:'Kraken',health:1650,maxHealth:1650,state:'idle',x:280,y:0};
  const player={x:0,y:0,heading:0};
  const attacks=[];
  const controller=new NavalBattleController({
    renderer:{prepareAmmo(){},attackKraken(options){attacks.push(options);return true;},destroy(){}},
    shipId:'starter',
    readSave:()=>({combat:{shipHealth:100}}),writePatch(){},
    getPlayer:()=>player,getEntities:()=>new Map([[monster.id,monster]]),
    clock:()=>time,
  });
  controller.fireKrakenStrikes(time);
  assert.equal(attacks.length,0,'Kraken não deve iniciar combate sem agressão');
  controller.resolveHarpoonImpact('kraken',{x:280,y:0},10);
  assert.equal(monster.state,'retaliating');
  controller.fireKrakenStrikes(time);
  assert.equal(attacks.length,1,'Kraken atingido reage dentro do alcance');
  time=6000;
  monster.x=KRAKEN_RETALIATION_RANGE+1;
  controller.fireKrakenStrikes(time);
  assert.equal(attacks.length,1,'não ataca fora do alcance');
});

test('canhão não fere monstro e arpão só fere monstro, com recarga e sem consumir bolas',()=>{
  const t=battleHarness();
  t.enemy.type='monster';t.enemy.name='Kraken';t.enemy.health=200;t.enemy.maxHealth=200;
  t.enemy.x=320;
  t.battle.setTarget(t.enemy.id);
  assert.equal(t.battle.getStatus().ready,true);
  assert.equal(t.battle.resolvePlayerImpact(t.enemy.id,{x:320,y:100},100).kind,'water');
  assert.equal(t.battle.toggleFire(),true);
  assert.equal(t.battle.resolvePlayerImpact(t.enemy.id,{x:320,y:100},100).kind,'water');
  assert.equal(t.enemy.health,200);
  assert.equal(t.shots.length,1);
  assert.equal(t.battle.getStatus().harpoonFiring,true);
  assert.equal(t.save.ammunition['rusted-iron'],20);
  assert.equal(t.save.harpoonAmmo['harpoon-mariner'],499);
  assert.equal(t.shots[0].onImpact({at:{x:320,y:100}}).kind,'ship');
  assert.equal(t.enemy.health,170);
  t.time=2000;
  t.battle.update(16,2000);
  assert.equal(t.shots.length,1);
  t.time=3600;
  t.battle.update(16,3600);
  assert.equal(t.shots.length,1);
  t.time=8100;
  t.battle.update(16,8100);
  assert.equal(t.shots.length,2);
  assert.equal(t.save.harpoonAmmo['harpoon-mariner'],498);
  t.battle.setTarget(null);
  assert.equal(t.battle.fireHarpoon(),false);
});
test('um único arpão inicial é equipado mesmo em save legado',async()=>{
  const {equippedHarpoon,STARTER_HARPOON}=await import('../src/combat/HarpoonCatalog.js');
  assert.equal(equippedHarpoon({}).id,STARTER_HARPOON.id);
  assert.equal(equippedHarpoon({equipment:{equippedHarpoonId:'unknown',ownedHarpoonIds:['unknown']}}).id,STARTER_HARPOON.id);
});

test('sem arpões o ataque em monstro é bloqueado sem gastar balas',()=>{
  const t=battleHarness();
  t.enemy.type='monster';t.enemy.health=200;
  t.save.harpoonAmmo['harpoon-mariner']=0;
  assert.equal(t.battle.getStatus().reason,'harpoon-ammo');
  assert.equal(t.battle.toggleFire(),false);
  assert.equal(t.shots.length,0);
  assert.equal(t.save.ammunition['rusted-iron'],20);
});

test('navegador mais próximo só ajuda durante ataque a monstro, com 25 de dano',()=>{
  const t=battleHarness();
  t.enemy.type='monster'; t.enemy.health=200; t.enemy.maxHealth=200;
  const helper={id:'sailor-a',type:'npc',health:100,x:310,y:125,name:'Navegador'};
  const far={id:'sailor-b',type:'npc',health:100,x:700,y:700,name:'Distante'};
  t.battle.getEntities=()=>new Map([[t.enemy.id,t.enemy],[helper.id,helper],[far.id,far]]);
  assert.equal(t.battle.getAssistStatus().eligible,false);
  assert.equal(t.battle.toggleFire(),true);
  assert.equal(t.battle.getAssistStatus().npc.id,helper.id);
  assert.equal(t.battle.enableMonsterAssist(),true);
  t.time=1200;t.battle.update(16,1200);
  assert.equal(t.shots.length,2);
  assert.equal(t.shots[1].onImpact({at:{x:t.enemy.x,y:t.enemy.y}}).kind,'ship');
  assert.equal(t.enemy.health,175);
  t.battle.toggleFire();
  assert.equal(t.battle.getAssistStatus().active,false);
});

test('NPCs podem ser atacados em R2 sem depender de progresso do tutorial da R1',()=>{
  const t=battleHarness({mission:'none'});
  t.battle.getRegionId=()=> 'r2';
  assert.equal(t.battle.getStatus().ready,true);
  assert.equal(t.battle.toggleFire(),true);
  assert.equal(t.shots.length,1);
  assert.equal(t.save.ammunition['rusted-iron'],19);
});

test('dois NPCs continuam após dez tiros e param em 3% de vida', () => {
  const t = battleHarness();
  t.enemy.type = 'monster';
  t.enemy.health = 10000;
  t.enemy.maxHealth = 10000;
  const helpers = ['a','b','c'].map((id,i) => ({
    id: 'sailor-'+id, name: 'Navegador '+id,
    type: 'npc', health: 100, x: 300+i*10, y: 130,
  }));
  t.battle.getEntities = () => new Map([[t.enemy.id,t.enemy],...helpers.map(n=>[n.id,n])]);
  t.battle.toggleFire();
  assert.equal(t.battle.enableMonsterAssist(), true);
  assert.equal(t.battle.enableMonsterAssist(), true);
  assert.equal(t.battle.enableMonsterAssist(), false);
  for (let i=0;i<11;i++) t.battle.fireAssistHarpoon(1200+i*7000);
  assert.equal(t.shots.length,23, 'each helper can shoot more than ten times');
  assert.equal(t.battle.getAssistStatus().activeCount,2);
  assert.equal(helpers[1].monsterAssisting,true);

  t.enemy.health = 310;
  t.battle.fireAssistHarpoon(82000);
  const last = t.shots.at(-1);
  assert.equal(last.onImpact({at:{x:t.enemy.x,y:t.enemy.y}}).kind,'ship');
  assert.equal(t.enemy.health,300,'NPC damage cannot reduce health below 3%');
  assert.equal(t.battle.getAssistStatus().activeCount,0);
  assert.equal(helpers[1].monsterAssisting,false);
  assert.equal(helpers[2].monsterAssisting,false);
  assert.equal(t.battle.getAssistStatus().eligible,false);
  t.battle.fireAssistHarpoon(90000);
  assert.equal(t.battle.enableMonsterAssist(),false);
});

test('encerrar o combate libera navegação dos ajudantes sem reiniciar seus contadores', () => {
  const t = battleHarness();
  t.enemy.type = 'monster';
  t.enemy.health = 10000;
  t.enemy.maxHealth = 10000;
  const helper = { id: 'sailor-a', name: 'Navegador', type: 'npc', health: 100, x: 300, y: 120 };
  t.battle.getEntities = () => new Map([[t.enemy.id,t.enemy],[helper.id,helper]]);
  t.battle.toggleFire();
  t.battle.enableMonsterAssist();
  assert.equal(helper.monsterAssisting, true);
  t.battle.toggleFire();
  assert.equal(helper.monsterAssisting, false);
  assert.equal(t.battle.getAssistStatus().activeCount, 0);
  t.battle.toggleFire();
  assert.equal(t.battle.getAssistStatus().eligible, false);
});

test('informante ativo não é selecionável nem recebe dano de disparos em voo', () => {
  const t = battleHarness();
  t.enemy.id = 'r2-informant';
  t.enemy.name = 'Corsário Informante';
  t.enemy.informantProtected = true;
  t.enemy.health = 500;
  t.enemy.maxHealth = 500;
  assert.equal(t.battle.getTarget(), null);
  assert.equal(t.battle.setTarget(t.enemy.id, { manual: true }), false);
  assert.equal(t.battle.toggleFire(), false);
  assert.equal(t.shots.length, 0);
  assert.equal(t.battle.resolvePlayerImpact(t.enemy.id, {x:320,y:100}, 100).kind, 'water');
  assert.equal(t.enemy.health, 500);
  t.enemy.informantProtected = false;
  t.enemy.name = 'Corsário das Velas Rubras';
  assert.equal(t.battle.setTarget(t.enemy.id, { manual: true }), true);
  assert.equal(t.battle.getTarget()?.id, 'r2-informant');
});

test('missão 11 prioriza ladrão e exige Caçadora com Aetherion MK-I', () => {
  const t = battleHarness();
  const thief = {id:'fugitive-frigate-r2-01',type:'npc',archetype:'fugitive-frigate',name:'Ladrão da Sombra',
    x:300,y:100,heading:0,health:100000,maxHealth:100000,state:'fleeing',aggression:'flee',cannonSlots:1};
  t.battle.getRegionId=()=> 'r2';
  t.save.r2Campaign={active:'r2-destroy-thief'};
  t.battle.getEntities=()=>new Map([[thief.id,thief],[t.enemy.id,t.enemy]]);
  t.battle.updateAutoTarget(200);
  assert.equal(t.battle.targetId,thief.id);
  assert.equal(t.battle.setTarget(t.enemy.id,{manual:true}),false);
  assert.equal(t.battle.getStatus().ready,true);
  t.battle.shipId='fragata-sombra-cacadora';
  t.save.equipment.loadout['fragata-sombra-cacadora']=['aetherion-mk1'];
  t.save.ammunition['aetherion-seeker']=50;
  assert.equal(t.battle.setAmmo('aetherion-seeker'),true);
  assert.equal(t.battle.getStatus().ready,true);
  t.battle.fireNpcVolleys(1000);
  const projectile=t.shots.at(-1);
  assert.ok(projectile,'Ladrão dispara seu próprio projétil');
  assert.equal(projectile.onImpact({at:{x:t.player.x,y:t.player.y}}).kind,'ship');
  assert.equal(t.save.combat.shipHealth,97);
  t.battle.fireNpcVolleys(1100);
  assert.equal(t.shots.length,1,'recarga deve impedir disparo antecipado');
});


test('stale combat guidance clears after a valid target is selected', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/ui/NavalCombatHud.js', import.meta.url), 'utf8'));
  assert.match(source, /automaticFeedback/);
  assert.match(source, /feedback\.textContent === automaticFeedback/);
});


test('Morbi usa um único canhão pesado de 1200 de dano com recarga de 45 segundos', () => {
  const t = battleHarness();
  t.enemy.id = 'r2-morbi';
  t.enemy.name = 'Morbi · Galeão Dourado';
  t.enemy.health = 900000;
  t.enemy.maxHealth = 900000;
  t.enemy.cannonSlots = 1;
  t.enemy.damage = 1200;
  t.enemy.specialCannon = {
    id:'morbi-golden-cannon',
    name:'Canhão Dourado de Morbi',
    damage:1200,
    reloadMs:45000,
  };
  t.save.r2Campaign = {active:'r2-golden-ii'};
  let receivedDamage = null;
  t.battle.resolveNpcImpact = (_id, _at, damage) => {
    receivedDamage = damage;
    return {kind:'ship'};
  };

  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length, 1);
  t.shots[0].onImpact({at:t.shots[0].to});
  assert.equal(receivedDamage, 1200);

  t.battle.fireNpcVolleys(45999);
  assert.equal(t.shots.length, 1, 'não pode disparar antes de completar 45 segundos');

  t.battle.fireNpcVolleys(46000);
  assert.equal(t.shots.length, 2, 'segundo disparo libera exatamente após 45 segundos');
});


test('câmera 1x1 aproxima quando os navios estão lado a lado e abre quando se afastam', async () => {
  const { computeOneVsOneFraming } = await import('../src/world/BattleCamera.js');
  const close = computeOneVsOneFraming({
    player:{x:1000,y:1000},target:{x:1280,y:1000},
    viewportWidth:390,viewportHeight:844,normalZoom:.88,
  });
  const far = computeOneVsOneFraming({
    player:{x:1000,y:1000},target:{x:2300,y:1700},
    viewportWidth:390,viewportHeight:844,normalZoom:.88,
  });
  assert.ok(close.zoom > far.zoom);
  assert.deepEqual(close.offset, {x:140,y:-28});
  assert.ok(far.zoom >= .18);
});

test('Rosa do Terror usa impacto reduzido para não encobrir a batalha', async () => {
  const { AMMO_FX_PRESETS } = await import('../src/combat/fx/AmmoFxProfile.mjs');
  const fx = AMMO_FX_PRESETS['terror-rose'];
  assert.ok(fx.impactShip.size <= 110);
  assert.ok(fx.impactShip.flash <= .6);
  assert.ok(fx.impactShip.ringCount <= 2);
});


test('Morbi não fica parado fora do alcance e usa o alcance configurado do canhão especial', async () => {
  const mainSource = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(mainSource, /playerRange\*\.88/);
  assert.match(mainSource, /chaseSpeed=stageTwo\?320:220/);
  assert.match(mainSource, /specialCannon:Object\.freeze\([\s\S]*range:840/);

  const t = battleHarness();
  t.enemy.id = 'r2-morbi';
  t.enemy.health = 900000;
  t.enemy.maxHealth = 900000;
  t.enemy.specialCannon = {damage:1200,reloadMs:45000,range:840};
  t.save.r2Campaign = {active:'r2-golden-ii'};
  t.enemy.x = t.player.x + 841;
  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length, 0, 'fora do alcance o canhão não dispara');
  t.enemy.x = t.player.x + 840;
  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length, 1, 'no limite do alcance o canhão já pode disparar');
});


test('duel camera call never references undefined normalZoom', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /normalZoom:normalCameraZoom/);
  assert.doesNotMatch(source, /viewportHeight:viewportH,normalZoom,\s*\}\)/);
});


test('Morbi entra na área de combate da bateria inteira, não só dos canhões de maior alcance', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /Math\.min\(\.\.\.playerRanges\)/);
  assert.doesNotMatch(source, /Math\.max\(\.\.\.playerRanges\)/);
  assert.match(source, /playerCombatRange\*\.88/);
});


test('câmera de duelo mantém o jogador dentro da zona segura mesmo em perseguição longa', async () => {
  const { computeOneVsOneFraming } = await import('../src/world/BattleCamera.js');
  const frame = computeOneVsOneFraming({
    player:{x:1000,y:1000},
    target:{x:2600,y:1750},
    viewportWidth:390,
    viewportHeight:844,
    normalZoom:.88,
  });
  assert.equal(frame.mode,'far');
  assert.ok(Math.abs(frame.playerScreenOffset.x) <= 390*.20 + 1);
  assert.ok(Math.abs(frame.playerScreenOffset.y) <= 844*.17 + 1);
  assert.ok(frame.zoom >= .19);
});

test('câmera de duelo abre o zoom antes de abandonar a âncora do jogador', async () => {
  const { computeOneVsOneFraming } = await import('../src/world/BattleCamera.js');
  const close = computeOneVsOneFraming({
    player:{x:1000,y:1000},target:{x:1250,y:1000},
    viewportWidth:390,viewportHeight:844,normalZoom:.88,
  });
  const far = computeOneVsOneFraming({
    player:{x:1000,y:1000},target:{x:2600,y:1000},
    viewportWidth:390,viewportHeight:844,normalZoom:.88,
  });
  assert.ok(close.zoom > far.zoom);
  assert.ok(Math.abs(far.playerScreenOffset.x) <= 390*.20 + 1);
});


test('Morbi entra no modo extremo depois de 300 de dano e dispara 2 especiais mais a bateria regular', () => {
  const t = battleHarness();
  t.enemy.id='r2-morbi';
  t.enemy.health=899700;
  t.enemy.maxHealth=900000;
  t.enemy.x=t.player.x+500;
  t.enemy.specialCannon={
    damage:1200,reloadMs:45000,range:840,
    countBeforePhase:1,countAfterPhase:2,
  };
  t.enemy.broadside={
    unlockDamageTaken:300,
    regularCannons:18,
    regularDamage:300,
    reloadMs:3000,
    range:840,
  };
  t.enemy.broadsideActive=true;
  t.save.r2Campaign={active:'r2-golden-ii'};

  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length,20,'modo extremo deve lançar 2 especiais + 18 regulares');
  const damages=[];
  t.battle.resolveNpcImpact=(_id,_at,damage)=>{damages.push(damage);return {kind:'ship'};};
  for(const shot of t.shots)shot.onImpact({at:shot.to});
  assert.equal(damages.filter(v=>v===1200).length,2);
  assert.equal(damages.filter(v=>v===300).length,18);

  t.battle.fireNpcVolleys(3999);
  assert.equal(t.shots.length,20,'bateria regular respeita 3 segundos');
  t.battle.fireNpcVolleys(4000);
  assert.equal(t.shots.length,38,'só a bateria regular recarrega antes dos especiais');
});


test('projéteis navais usam metade do tamanho visual', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/NavalCombatWebGLRenderer.mjs', import.meta.url), 'utf8'));
  assert.match(source, /\*0\.5,2,13/);
});


test('NPC com vários canhões também dispara em sequência', () => {
  const t = battleHarness();
  t.enemy.cannonSlots = 3;
  t.enemy.range = 520;
  t.enemy.damage = 12;
  t.enemy.x = 500;
  t.enemy.state = 'retaliating';
  t.enemy.aggression = 'attack';

  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length,1);

  t.battle.fireNpcVolleys(1159);
  assert.equal(t.shots.length,1);

  t.battle.fireNpcVolleys(1160);
  assert.equal(t.shots.length,2);

  t.battle.fireNpcVolleys(1320);
  assert.equal(t.shots.length,3);
});

test('Morbi extremo não solta os 20 tiros no mesmo frame', () => {
  const t = battleHarness();
  t.enemy.id='r2-morbi';
  t.enemy.health=899700;
  t.enemy.maxHealth=900000;
  t.enemy.x=t.player.x+500;
  t.enemy.specialCannon={damage:1200,reloadMs:45000,range:840,countBeforePhase:1,countAfterPhase:2};
  t.enemy.broadside={unlockDamageTaken:300,regularCannons:18,regularDamage:300,reloadMs:3000,range:840};
  t.enemy.broadsideActive=true;
  t.save.r2Campaign={active:'r2-golden-ii'};

  t.battle.fireNpcVolleys(1000);
  assert.equal(t.shots.length,2,'uma especial e uma regular iniciam as duas sequências, sem aglomerado');

  t.battle.fireNpcVolleys(1159);
  assert.equal(t.shots.length,2);

  t.battle.fireNpcVolleys(1160);
  assert.equal(t.shots.length,4,'as duas baterias avançam um canhão por vez');
});


test('efeitos de combate acompanham o zoom da câmera', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/NavalCombatWebGLRenderer.mjs', import.meta.url), 'utf8'));
  assert.match(source, /const combatVisualScale=clamp\(\(Number\(zoom\)\|\|1\)\/\.88,\.22,1\.12\)/);
  assert.match(source, /drawCombatPoint\(x,y,Math\.max\(\.75,Number\(size\)\|\|0\)\*combatVisualScale/);
  assert.match(source, /assetSize\*combatVisualScale\*this\.pixelRatio/);
  assert.match(source, /for\(const impact of this\.impacts\)/);
  assert.match(source, /drawCombatPoint\(\s*impact\.x,impact\.y/);
});


test('floating damage usa texto vermelho sem fundo e escala com a câmera', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/DamageTextRenderer.js', import.meta.url), 'utf8'));
  assert.match(source, /fillStyle='#ff3b3b'/);
  assert.match(source, /visualScale=clamp\(\(Number\(zoom\)\|\|1\)\/\.88,\.32,1\.08\)/);
  assert.doesNotMatch(source, /fillRect|strokeRect|roundRect/);
});

test('nome do NPC escala junto com o zoom da câmera', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/NpcRenderer.js', import.meta.url), 'utf8'));
  assert.match(source, /labelScale=Math\.max\(\.42,Math\.min\(1\.08,\(Number\(zoom\)\|\|1\)\/\.88\)\)/);
});

test('cada impacto naval pode emitir dano visual ancorado ao alvo', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/combat/NavalBattleController.js', import.meta.url), 'utf8'));
  assert.match(source, /onDamageVisual = \(\) => \{\}/);
  assert.match(source, /onDamageVisual\(\{target,damage:actualDamage,source:'player'\}\)/);
  assert.match(source, /onDamageVisual\(\{target:player,damage:actualDamage,source:'npc'\}\)/);
});


test('tesouros usam o asset de destroços piratas em tamanho apropriado', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/TreasureRenderer.js', import.meta.url), 'utf8'));
  assert.match(source, /destrocos-piratas-tesouro\.webp/);
  assert.match(source, /const baseSize = 76/);
  assert.match(source, /ctx\.drawImage\(this\.image/);
  assert.doesNotMatch(source, /roundRect\(-19, -9, 38, 27/);
});


test('destroços navegam até colisão antes de abrir a continha', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /pendingTreasureId=treasure\.id/);
  assert.match(source, /return \{destination:\{x:treasure\.x,y:treasure\.y\}\}/);
  assert.match(source, /Math\.hypot\(world\.camera\.x-target\.x,world\.camera\.y-target\.y\)<=72/);
  assert.match(source, /openTreasureChallenge\(target\)/);
  assert.match(source, /if\(action\.kind==='treasure'\) pendingTreasureId=null/);
});

test('destroços recebem brilho WebGL pulsante', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/rendering/TreasureGlowWebGLRenderer.js', import.meta.url), 'utf8'));
  assert.match(source, /getContext\('webgl2'/);
  assert.match(source, /gl\.blendFunc\(gl\.SRC_ALPHA,gl\.ONE\)/);
  assert.match(source, /uSelected/);
  assert.match(source, /112\*visualZoom/);
});

test('navegação por clique aceita redirecionamento para alvo interativo', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/world/ClickNavigationInput.js', import.meta.url), 'utf8'));
  assert.match(source, /handled\?\.destination/);
  assert.match(source, /destination = \{x:Number\(handled\.destination\.x\),y:Number\(handled\.destination\.y\)\}/);
});


test('Morbi permanece no enquadramento mesmo sem seleção manual e bloqueia desvios por tesouro', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /\['r2-golden-i','r2-golden-ii'\]\.includes\(activeR2Mission\)/);
  assert.match(source, /oneVsOneTarget = !world\.manualCamera && morbiEncounter\?\.health > 0/);
  assert.match(source, /\['r2-destroy-thief','r2-golden-i','r2-golden-ii'\]\.includes\(readSave\(\)\.r2Campaign\?\.active\)/);
});


test('Morbi ativo nunca reaparece invisível com vida zero salva', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /const restoredMorbiHealth=Number\.isFinite\(savedMorbiHealth\) && savedMorbiHealth>0/);
  assert.match(source, /: 900000;/);
  assert.match(source, /health:restoredMorbiHealth,maxHealth:900000/);
  assert.match(source, /if\(Number\.isFinite\(savedMorbiHealth\) && savedMorbiHealth<=0\)/);
});
