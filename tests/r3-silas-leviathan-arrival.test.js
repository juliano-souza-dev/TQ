import test from 'node:test';
import assert from 'node:assert/strict';
import {
  R3_SILAS_REWARD, R3_SILAS_MISSION_ID, exchangeR3SilasCargo,
  verifySilasArsenalAtLeviathan,
} from '../src/missions/R3SilasTrade.js';
import {HORIZON_HARPOON_ID} from '../src/combat/HarpoonCatalog.js';

const huntSave=(overrides={})=>({
  r3Campaign:{
    active:'r3-leviathan-hunt',
    claimed:['r3-equip-golden','r3-dark-waters-warning',R3_SILAS_MISSION_ID],
    silasTradeCompleted:true,
    ...overrides.r3Campaign,
  },
  equipment:{
    equippedShipId:'galeao-dourado',
    ownedShipIds:['galeao-dourado'],
    cannonCounts:{...R3_SILAS_REWARD.cannons},
    ownedCannonIds:Object.keys(R3_SILAS_REWARD.cannons),
    ownedHarpoonIds:[HORIZON_HARPOON_ID],
    equippedHarpoonId:HORIZON_HARPOON_ID,
    loadout:{'galeao-dourado':['aetherion-mk1','aetherion-mk1',
      ...Array(5).fill('pumpkin-terror')]},
    ...overrides.equipment,
  },
  ammunition:{...R3_SILAS_REWARD.ammunition,...overrides.ammunition},
  harpoonAmmo:{...R3_SILAS_REWARD.harpoonAmmo,...overrides.harpoonAmmo},
  shipUpgrades:overrides.shipUpgrades,
});

const applied=(save,patch)=>({...save,...patch});

test('arrival checks only an active hunt after the real Silas trade was claimed',()=>{
  const valid=huntSave();
  for(const r3Campaign of [
    {active:'r3-leviathan-hunt',claimed:[],silasTradeCompleted:true},
    {active:'r3-leviathan-hunt',claimed:[R3_SILAS_MISSION_ID],silasTradeCompleted:false},
    {active:'r3-silas-pact',claimed:[R3_SILAS_MISSION_ID],silasTradeCompleted:true},
    {active:'r3-leviathan-hunt',claimed:[R3_SILAS_MISSION_ID],silasTradeCompleted:true,leviathanDefeated:true},
  ]){
    assert.equal(verifySilasArsenalAtLeviathan({...valid,r3Campaign}),null);
  }
  assert.equal(verifySilasArsenalAtLeviathan({...valid,equipment:{...valid.equipment,equippedShipId:null}}),null);
});

test('properly delivered Silas package is verified silently without duplication',()=>{
  const save=huntSave();
  const patch=verifySilasArsenalAtLeviathan(save);
  assert.deepEqual(Object.keys(patch),['r3Campaign']);
  assert.equal(patch.r3Campaign.silasArsenalArrivalVerified,true);
  assert.deepEqual(applied(save,patch).ammunition,R3_SILAS_REWARD.ammunition);
  assert.deepEqual(applied(save,patch).harpoonAmmo,R3_SILAS_REWARD.harpoonAmmo);
  assert.equal(verifySilasArsenalAtLeviathan(applied(save,patch)),null);
});

test('missing legacy delivery is restored once and cannon loadout assembled at the encounter',()=>{
  const original=huntSave();
  const shipLoadout={'galeao-dourado':['royal-lion'],'starter':['blue-gold-pirate']};
  const broken={
    ...original,
    ammunition:{'aetherion-seeker':undefined,'volcanic-lava':undefined,'terror-rose':35,'rusted-iron':11},
    harpoonAmmo:{},
    equipment:{
      ...original.equipment,
      cannonCounts:{'aetherion-mk1':1,'pumpkin-terror':16,'royal-lion':1},
      ownedCannonIds:['royal-lion'],
      ownedHarpoonIds:['naval-harpoon-starter'],
      equippedHarpoonId:'naval-harpoon-starter',
      loadout:shipLoadout,
    },
  };
  const patch=verifySilasArsenalAtLeviathan(broken);
  assert.ok(patch);
  assert.equal(patch.equipment.cannonCounts['aetherion-mk1'],2);
  assert.equal(patch.equipment.cannonCounts['pumpkin-terror'],18);
  assert.equal(patch.equipment.cannonCounts['royal-lion'],1);
  assert.deepEqual(patch.equipment.loadout['galeao-dourado'],[
    'aetherion-mk1','aetherion-mk1',...Array(5).fill('pumpkin-terror')]);
  assert.deepEqual(patch.equipment.loadout.starter,['blue-gold-pirate']);
  assert.equal(patch.equipment.equippedHarpoonId,HORIZON_HARPOON_ID);
  assert.ok(patch.equipment.ownedHarpoonIds.includes('naval-harpoon-starter'));
  assert.ok(patch.equipment.ownedHarpoonIds.includes(HORIZON_HARPOON_ID));
  assert.deepEqual(patch.ammunition,{
    'aetherion-seeker':2500,'volcanic-lava':2000,'terror-rose':35,'rusted-iron':11,
  });
  assert.deepEqual(patch.harpoonAmmo,{'harpoon-horizon-incendiary':1000});
  assert.equal(verifySilasArsenalAtLeviathan(applied(broken,patch)),null);
});

test('spent ammunition and harpoons are never replenished, even on first arrival',()=>{
  const save=huntSave({ammunition:{
    'aetherion-seeker':0,'volcanic-lava':15,'terror-rose':0,
  },harpoonAmmo:{'harpoon-horizon-incendiary':0}});
  const patch=verifySilasArsenalAtLeviathan(save);
  assert.equal(patch.ammunition,undefined);
  assert.equal(patch.harpoonAmmo,undefined);
  assert.equal(verifySilasArsenalAtLeviathan(applied(save,patch)),null);
});

test('repeat approach re-arms equipment without a second consumable delivery',()=>{
  const checked=huntSave({r3Campaign:{silasArsenalArrivalVerified:true}});
  const changed={
    ...checked,
    ammunition:{'aetherion-seeker':undefined},
    harpoonAmmo:{'harpoon-horizon-incendiary':undefined},
    equipment:{...checked.equipment,loadout:{...checked.equipment.loadout,'galeao-dourado':[]},
      equippedHarpoonId:'naval-harpoon-starter'},
  };
  const patch=verifySilasArsenalAtLeviathan(changed);
  assert.ok(patch.equipment);
  assert.equal(patch.r3Campaign,undefined);
  assert.equal(patch.ammunition,undefined);
  assert.equal(patch.harpoonAmmo,undefined);
  assert.deepEqual(patch.equipment.loadout['galeao-dourado'],[
    'aetherion-mk1','aetherion-mk1',...Array(5).fill('pumpkin-terror')]);
});

test('real cannon capacity and upgraded slots are respected at the encounter',()=>{
  const save=huntSave({shipUpgrades:{masterShipwright:true},
    equipment:{loadout:{'galeao-dourado':[]}}});
  const patch=verifySilasArsenalAtLeviathan(save);
  assert.equal(patch.equipment.loadout['galeao-dourado'].length,12);
  assert.deepEqual(patch.equipment.loadout['galeao-dourado'].slice(0,2),
    ['aetherion-mk1','aetherion-mk1']);
  const withoutUpgrade=huntSave({equipment:{loadout:{'galeao-dourado':[]}}});
  assert.equal(verifySilasArsenalAtLeviathan(withoutUpgrade).equipment.loadout['galeao-dourado'].length,7);
});

test('Silas completed exchange remains the entitlement and is not re-executed',()=>{
  const save={
    r3Campaign:{active:R3_SILAS_MISSION_ID,claimed:['r3-equip-golden','r3-dark-waters-warning']},
    equipment:{equippedShipId:'galeao-dourado',ownedShipIds:['galeao-dourado'],
      cannonCounts:{'royal-lion':1},ownedCannonIds:['royal-lion'],loadout:{'galeao-dourado':['royal-lion']}},
    ammunition:{'rusted-iron':120},
  };
  const trade=exchangeR3SilasCargo(save);
  assert.ok(trade);
  const completed={...save,...trade,
    r3Campaign:{...trade.r3Campaign,active:'r3-leviathan-hunt',
      claimed:[...trade.r3Campaign.claimed,R3_SILAS_MISSION_ID]}};
  const patch=verifySilasArsenalAtLeviathan(completed);
  assert.equal(patch.equipment,undefined);
  assert.equal(patch.ammunition,undefined);
  assert.equal(patch.harpoonAmmo,undefined);
  assert.deepEqual(completed.r3Campaign.silasHoldings.ammunition,{'rusted-iron':120});
});

test('arrival logic in game loop silently reconciles before marking the sighting',async()=>{
  const fs=await import('node:fs/promises');
  const main=await fs.readFile(new URL('../src/main.js',import.meta.url),'utf8');
  const from=main.indexOf("const patch=verifySilasArsenalAtLeviathan(save);");
  const found=main.indexOf("recordMissionEvent({type:'leviathan-found',id:leviathan.id})",from);
  assert.ok(from>0&&found>from);
  const block=main.slice(from,found);
  assert.match(block,/writePatch\(patch\)/);
  assert.match(block,/navalHud\?\.refresh\(\)/);
  assert.doesNotMatch(block,/showOceanReward|mathGate\.open|islandPanel\.open/);
  assert.match(main,/Math\.hypot\(world\.camera\.x-leviathan\.x,world\.camera\.y-leviathan\.y\)<=950/);
});
