import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorldState } from '../src/world/WorldState.js';
import { R4 } from '../src/world/regions/r4.js';
import { FLEET_REGIONS,fleetRole,encounterMatches,recordFleetDefeat,fleetProgress } from '../src/missions/FleetCampaign.js';
import { PLAYABLE_FROZEN_LANDS } from '../src/ships/FleetAutoEquipment.js';
import { collidesWithIsland } from '../src/world/IslandCollision.js';
import { createFrozenMirrorBoss } from '../src/npcs/FrozenMirrorBoss.js';

function makeSave(){
 const count=FLEET_REGIONS.r4.enemyGoal;
 return {fleetCampaign:{version:1,region:4,defeated:{r4:Array.from({length:count},(_,i)=>'r4-fleet-'+i)},
  treasures:{r4:['test']},monsters:{},bosses:{r4:[]},preparedRegions:['r4'],treasureGoal:{r4:1}}};
}
test('R4 boss is Almirante Boreal, not Sombra do Saque',()=>{
 const encounter=FLEET_REGIONS.r4.encounters[0];
 assert.equal(encounter.id,'r4-almirante-boreal');
 assert.equal(encounter.shipId,PLAYABLE_FROZEN_LANDS.id);
 assert.match(encounter.name,/Boreal/);
 assert.equal(encounterMatches(encounter,{id:'r4-sombra-do-saque',archetype:'dark-waters-raider'}),false);
 assert.equal(fleetRole('r4',{id:'r4-sombra-do-saque',archetype:'dark-waters-raider'}),null);
});
test('mirror fleet boss uses the exact player ship sprite and nine gunports',()=>{
 const world=createWorldState(R4);world.fleetNoRespawn=true;
 const boss=createFrozenMirrorBoss(world);
 assert.ok(boss);
 assert.equal(boss.shipId,PLAYABLE_FROZEN_LANDS.id);
 assert.equal(boss.cannonSlots,PLAYABLE_FROZEN_LANDS.cannonSlots);
 assert.deepEqual(boss.cannonLayout,PLAYABLE_FROZEN_LANDS.cannonLayout);
 assert.equal(boss.archetype,'frozen-mirror-boss');
 assert.equal(collidesWithIsland(R4,boss.x,boss.y,100),false);
 assert.ok(Math.hypot(boss.x-world.camera.x,boss.y-world.camera.y)>=300);
 assert.equal(createFrozenMirrorBoss(world),boss,'only one boss per world');
});
test('R4 victory requires defeating Almirante Boreal, once',()=>{
 const save=makeSave();
 assert.equal(fleetProgress(save,'r4',1).encounter.id,'r4-almirante-boreal');
 const boss={id:'r4-almirante-boreal',type:'npc',archetype:'frozen-mirror-boss',
  shipId:'corsario-geada-negra'};
 const patch=recordFleetDefeat(save,'r4',boss);
 assert.ok(patch);
 const after={...save,...patch};
 assert.equal(fleetProgress(after,'r4',1).complete,true);
 assert.equal(recordFleetDefeat(after,'r4',boss),null);
 assert.equal(recordFleetDefeat(save,'r4',{id:'r4-sombra-do-saque',
  type:'npc',archetype:'dark-waters-raider'}),null);
});
test('old R4 Sombra victories remain complete without replaying the fight',()=>{
 const save=makeSave();
 save.fleetCampaign.bosses.r4=['r4-sombra-do-saque'];
 assert.equal(fleetProgress(save,'r4',1).complete,true);
});
test('R4 boss spawn and combat are wired in the live campaign',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const combat=readFileSync(new URL('../src/combat/NavalBattleController.js',import.meta.url),'utf8');
 assert.match(main,/createFrozenMirrorBoss\(world\)/);
 assert.match(main,/npc\.archetype==='frozen-mirror-boss'/);
 assert.match(combat,/npc\.archetype==='frozen-mirror-boss'/);
 assert.match(combat,/mirror-broadside-sequence/);
 assert.match(combat,/mirror-freeze-sequence/);
});
