import test from 'node:test';
import assert from 'node:assert/strict';
import {FLEET_REGIONS,fleetProgress,fleetTreasureGoal,getFleetTreasures,recordFleetTreasure,recordFleetDefeat} from '../src/missions/FleetCampaign.js';
import {FUTURE_FLEET_REGIONS} from '../src/world/regions/FutureFleetRegions.js';
import {createFleetPopulation} from '../src/npcs/FleetPopulation.js';
import {createMonsterPopulation} from '../src/monsters/MonsterPopulation.js';
import {rollNpcAmmoLoot} from '../src/combat/NpcAmmoLoot.js';
import {grantFleetEntry,fleetShipForRegion} from '../src/ships/FleetAutoEquipment.js';
import {effectiveAmmo} from '../src/combat/NavalBattleRules.js';
import {MOON_BARRAGE_AMMO_ID,R5_ECLIPSE_BOSS_ID,R5_LEVIATHAN_ID,lunarRandomAmount} from '../src/missions/RegionFiveEclipse.js';

const region=FUTURE_FLEET_REGIONS.r5;
const saveFor=()=>({
  fleetCampaign:{version:1,region:5,defeated:{},monsters:{},treasures:{},bosses:{},
    preparedRegions:[],completedRegions:[]},
  equipment:{equippedShipId:'corsario-geada-negra',
    ownedShipIds:['starter-red-sails','corsario-geada-negra'],
    loadout:{'corsario-geada-negra':['ice-terror']}},
  ammunition:{[MOON_BARRAGE_AMMO_ID]:0}
});

test('R5 moon ammunition rewards respect exact inclusive ranges',()=>{
  assert.equal(rollNpcAmmoLoot('r5',()=>0).amount,700);
  assert.equal(rollNpcAmmoLoot('r5',()=>.999999).amount,1000);
  assert.equal(rollNpcAmmoLoot('r5').id,MOON_BARRAGE_AMMO_ID);
  assert.equal(lunarRandomAmount(100,1500,()=>0),100);
  assert.equal(lunarRandomAmount(100,1500,()=>.999999),1500);
  assert.ok(effectiveAmmo(MOON_BARRAGE_AMMO_ID));
});

test('R5 raiders triple hit points and deal ten times base damage',()=>{
  const world={region,camera:{...region.spawn},fleetNoRespawn:true,entities:new Map()};
  createFleetPopulation(world,()=>.431);
  const first=world.entities.get('r5-fleet-01');
  assert.ok(first);
  const previousHp=Math.round((16000+5*3600)*1.9);
  const previousDamage=Math.max(2,Math.round((5+2)*1.25));
  assert.equal(first.maxHealth,previousHp*3);
  assert.equal(first.damage,previousDamage*10);
});

test('one required Leviathan spawns and does not respawn after victory',()=>{
  const world={region,camera:{...region.spawn},fleetNoRespawn:true,entities:new Map()};
  assert.equal(createMonsterPopulation(world,()=>.5,saveFor()),1);
  assert.equal(world.entities.get(R5_LEVIATHAN_ID)?.archetype,'sea-monster-leviathan');
  const beaten=saveFor();
  beaten.fleetCampaign.monsters.r5=[R5_LEVIATHAN_ID];
  const next={region,camera:{...region.spawn},fleetNoRespawn:true,entities:new Map()};
  assert.equal(createMonsterPopulation(next,()=>.5,beaten),0);
});

test('Leviathan and all other objectives block the Eclipse until completed',()=>{
  const base=saveFor(),plan=FLEET_REGIONS.r5;
  assert.equal(plan.monsterGoal,1);
  assert.equal(plan.encounters.at(-1).id,R5_ECLIPSE_BOSS_ID);
  base.fleetCampaign.preparedRegions=['r5'];
  base.fleetCampaign.defeated.r5=Array.from({length:plan.enemyGoal},(_,i)=>'r5-fleet-'+i);
  base.fleetCampaign.treasures.r5=['treasure-test'];
  assert.equal(fleetProgress(base,'r5',1).ready,false);
  base.fleetCampaign.monsters.r5=[R5_LEVIATHAN_ID];
  assert.equal(fleetProgress(base,'r5',1).encounter?.id,R5_ECLIPSE_BOSS_ID);
});

test('the ice ship is retained until Eclipse falls, then Eclipse is automatically equipped',()=>{
  const base=saveFor();
  assert.equal(fleetShipForRegion(base,'r5').id,'corsario-geada-negra');
  const entry=grantFleetEntry(base,'r5');
  assert.equal(entry.equipment.equippedShipId,'corsario-geada-negra');
  const prepped={...base,...entry};
  prepped.fleetCampaign.preparedRegions=['r5'];
  prepped.fleetCampaign.defeated.r5=Array.from({length:28},(_,i)=>'enemy-'+i);
  prepped.fleetCampaign.monsters.r5=[R5_LEVIATHAN_ID];
  prepped.fleetCampaign.treasures.r5=[];
  assert.equal(fleetProgress(prepped,'r5',0).ready,true);
  const victory=recordFleetDefeat(prepped,'r5',
    {id:R5_ECLIPSE_BOSS_ID,type:'npc',archetype:'eclipse-mirror-boss'});
  assert.equal(victory.equipment.equippedShipId,'galeao-eclipse');
  assert.equal(fleetShipForRegion({...prepped,...victory},'r5').id,'galeao-eclipse');
});

test('depleted lunar stock reveals unlimited rescue treasures without advancing normal objectives',()=>{
  let save=saveFor();
  // Collect all fixed chests progressively, respecting the game's five-wave limit.
  for(let i=0;i<10;i++){
    const visible=getFleetTreasures(save,'r5',region);
    if(!visible.length)break;
    save={...save,fleetCampaign:{...save.fleetCampaign,
      treasures:{r5:[...(save.fleetCampaign.treasures.r5??[]),...visible.map(t=>t.id)]}}};
  }
  const expected=fleetTreasureGoal('r5',region);
  assert.equal(save.fleetCampaign.treasures.r5.length,expected);
  save.fleetCampaign.preparedRegions=['r5'];
  save.fleetCampaign.defeated.r5=Array.from({length:28},(_,i)=>'enemy-'+i);
  save.fleetCampaign.monsters.r5=[R5_LEVIATHAN_ID];
  assert.equal(fleetProgress(save,'r5',expected).ready,true);
  const chest=getFleetTreasures(save,'r5',region).find(t=>t.id==='fleet-r5-moon-resupply-1');
  assert.ok(chest,'a nearby emergency chest must appear when lunar ammo is empty');
  const claimed=recordFleetTreasure(save,'r5',chest.id,region);
  assert.ok(claimed?.ammunition?.[MOON_BARRAGE_AMMO_ID]>=100);
  const withAmmo={...save,...claimed};
  assert.equal(fleetProgress(withAmmo,'r5',expected).collected,expected);
  assert.ok(!getFleetTreasures(withAmmo,'r5',region).some(t=>t.id.includes('moon-resupply')));
  const depleted={...withAmmo,ammunition:{...withAmmo.ammunition,[MOON_BARRAGE_AMMO_ID]:0}};
  assert.ok(getFleetTreasures(depleted,'r5',region).some(t=>t.id==='fleet-r5-moon-resupply-2'));
});
