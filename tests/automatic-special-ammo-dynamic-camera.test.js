import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CANNONS} from '../src/items/EquipmentCatalog.js';
import {
  cannonAcceptsAmmo,isSpecialNavalAmmo,isSpecialNavalCannon,
  bestSpecialAmmoForCannon,
} from '../src/combat/NavalBattleRules.js';
import {NavalBattleController} from '../src/combat/NavalBattleController.js';
import {bestFleetLoadout} from '../src/ships/FleetAutoEquipment.js';
import {computeDynamicCameraFraming} from '../src/world/BattleCamera.js';

const byId=id=>CANNONS.find(c=>c.id===id);

test('special ammo is exclusive to special cannons and is never manually selectable',()=>{
  const ice=byId('ice-terror'),guided=byId('aetherion-mk1'),normal=byId('royal-lion');
  assert.equal(isSpecialNavalCannon(ice),true);
  assert.equal(isSpecialNavalCannon(guided),true);
  assert.equal(isSpecialNavalCannon(normal),false);
  for(const id of ['glacial-seeker','frozen-explosion','moon-barrage','aetherion-seeker']){
    assert.equal(isSpecialNavalAmmo(id),true);
    assert.equal(cannonAcceptsAmmo(normal,id),false);
  }
  assert.equal(cannonAcceptsAmmo(ice,'glacial-seeker'),true);
  assert.equal(cannonAcceptsAmmo(ice,'aetherion-seeker'),false);
  assert.equal(cannonAcceptsAmmo(guided,'moon-barrage'),false);
  assert.equal(cannonAcceptsAmmo(guided,'aetherion-seeker'),true);
  assert.equal(cannonAcceptsAmmo(normal,'rusted-iron'),true);
  assert.equal(bestSpecialAmmoForCannon(ice,{'glacial-seeker':2,'frozen-explosion':4,'moon-barrage':100}),'glacial-seeker');
  assert.equal(bestSpecialAmmoForCannon(ice,{'glacial-seeker':0,'frozen-explosion':4,'moon-barrage':100}),'frozen-explosion');
  assert.equal(bestSpecialAmmoForCannon(ice,{'moon-barrage':100}),'moon-barrage');
  assert.equal(bestSpecialAmmoForCannon(ice,{'aetherion-seeker':5}),null);
  assert.equal(bestSpecialAmmoForCannon(guided,{'aetherion-seeker':5,'moon-barrage':100}),'aetherion-seeker');
  assert.equal(bestSpecialAmmoForCannon(normal,{'glacial-seeker':5}),null);
});

test('special cannon fires best available special ammo while regular gun uses manual round',()=>{
  let save={
    missions:{corsair:'active'},
    equipment:{loadout:{ship:['ice-terror','blue-gold-pirate']}},
    ammunition:{'glacial-seeker':2,'frozen-explosion':4,'moon-barrage':8,'rusted-iron':10},
    combat:{shipHealth:120},
  };
  const target={id:'enemy',type:'npc',name:'enemy',health:200000,maxHealth:200000,x:400,y:0};
  const shots=[];
  const battle=new NavalBattleController({
    renderer:{prepareAmmo(){},fire(s){shots.push(s);return true;}},
    shipId:'ship',readSave:()=>save,writePatch:patch=>{save={...save,...patch};},
    getRegionId:()=> 'r6',getPlayer:()=>({x:0,y:0,heading:90}),
    getEntities:()=>new Map([[target.id,target]]),clock:()=>1000,random:()=>.5,
  });
  battle.setTarget('enemy',{manual:true});
  assert.equal(battle.resolveSelectedAmmo(),'rusted-iron');
  assert.equal(battle.setAmmo('moon-barrage'),false);
  assert.equal(battle.setAmmo('glacial-seeker'),false);
  assert.equal(battle.setAmmo('frozen-explosion'),false);
  assert.equal(battle.setAmmo('rusted-iron'),true);
  assert.equal(battle.getStatus().ammoId,'glacial-seeker',
    'HUD reflects strongest automatic special round');
  assert.equal(battle.firePlayerVolley(1000),1);
  assert.equal(shots[0].ammo.id,'glacial-seeker');
  assert.equal(save.ammunition['glacial-seeker'],1);
  assert.equal(save.ammunition['rusted-iron'],10);
  assert.equal(battle.firePlayerVolley(1350),1);
  assert.equal(shots[1].ammo.id,'rusted-iron');
  assert.equal(save.ammunition['rusted-iron'],9);
  // Aetherion can never be spent by the non-exclusive ice cannon.
});

test('the strongest owned special cannon is first in automatic fleet equipment',()=>{
  const ship={id:'custom',cannonSlots:3};
  const save={equipment:{
    ownedCannonIds:['royal-lion','aetherion-mk1','ice-terror'],
    cannonCounts:{'royal-lion':3,'aetherion-mk1':1,'ice-terror':1}
  }};
  assert.deepEqual(bestFleetLoadout(save,ship),
    ['ice-terror','aetherion-mk1','royal-lion']);
});

test('dynamic camera starts elevated at sea and gradually lowers and approaches targets',()=>{
  const player={x:500,y:500};
  const distant=computeDynamicCameraFraming(player,null);
  const medium=computeDynamicCameraFraming(player,{x:950,y:500,health:10});
  const close=computeDynamicCameraFraming(player,{x:575,y:500,health:10});
  assert.ok(distant.pitch>medium.pitch && medium.pitch>close.pitch);
  assert.ok(distant.zoom<medium.zoom && medium.zoom<close.zoom);
  assert.equal(distant.pitch,1.18);
  assert.equal(distant.zoom,.76);
  assert.equal(close.zoom,1.02);
  assert.equal(computeDynamicCameraFraming(player,{x:575,y:500,health:0}).zoom,.76);
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.ok(main.includes('world.cameraPerspective = { enabled:true, yaw:0, pitch:1.18 }'));
  assert.ok(main.includes('updateDynamicCameraPitch();'));
  assert.ok(!main.includes('world.cameraPerspective.enabled || world.fleetNoRespawn'));
});

test('combat HUD hides prototype per-action logs but retains actionable warnings',()=>{
  const ui=readFileSync(new URL('../src/ui/NavalCombatHud.js',import.meta.url),'utf8');
  assert.ok(ui.includes('const importantFeedback = message =>'));
  assert.ok(ui.includes('if(!importantFeedback(text))return;'));
  assert.ok(ui.includes("isSpecialNavalAmmo(item.id)"));
  assert.ok(ui.includes('Munição especial usada automaticamente'));
  assert.ok(!ui.includes("feedback.textContent = nextAutomatic;"));
});
