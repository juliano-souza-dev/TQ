import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 recordFleetDefeat, reconcileFleetBossPrizes, fleetProgress,
} from '../src/missions/FleetCampaign.js';
import {fleetShipForRegion, bestFleetLoadout} from '../src/ships/FleetAutoEquipment.js';
import {
 projectToMinimapCircle, findTreasuresBehindMinimap, RADAR_CENTER, RADAR_RADIUS,
} from '../src/ui/Minimap.js';

const initial=()=>({
 fleetCampaign:{version:1,region:1,defeated:{r1:Array.from({length:19},(_,i)=>'r1-enemy-'+i)},
  monsters:{r1:['r1-monster-1','r1-monster-2']},treasures:{r1:[]},
  bosses:{},preparedRegions:['r1'],treasureGoal:{r1:0}},
 equipment:{equippedShipId:'starter-red-sails',ownedShipIds:['starter-red-sails'],
  ownedCannonIds:['blue-gold-pirate'],cannonCounts:{'blue-gold-pirate':3}},
 ammunition:{'rusted-iron':2000},
 combat:{shipHealth:7}
});

test('R1 boss grants its ship and seven real cannons, equips both, and restores the hull',()=>{
 const save=initial();
 assert.equal(fleetProgress(save,'r1',0).ready,true);
 const patch=recordFleetDefeat(save,'r1',{
  id:'terror-da-tabuada',archetype:'terror-da-tabuada',type:'npc',name:'Terror da Tabuada',
 });
 assert.ok(patch);
 assert.ok(patch.equipment.ownedShipIds.includes('galeao-halloween-tabuada'));
 assert.equal(patch.equipment.equippedShipId,'galeao-halloween-tabuada');
 assert.equal(patch.equipment.cannonCounts['royal-lion'],7);
 assert.equal(patch.equipment.loadout['galeao-halloween-tabuada'].filter(id=>id==='royal-lion').length,7);
 assert.ok(patch.ammunition['rusted-iron']>=30000);
 assert.equal(patch.combat.shipHealth,120);
 assert.equal(fleetShipForRegion({...save,...patch},'r1').id,'galeao-halloween-tabuada');
 assert.equal(reconcileFleetBossPrizes({...save,...patch}),null);
});
test('saved R1 boss victory receives the missed reward without replay or inventory loss',()=>{
 const save=initial();
 save.fleetCampaign.bosses={r1:['terror-da-tabuada']};
 save.fleetCampaign.treasures={r1:['t1','t2']};
 save.equipment.ownedCannonIds.push('spiked-war');
 save.equipment.cannonCounts['spiked-war']=2;
 const patch=reconcileFleetBossPrizes(save);
 assert.ok(patch,'old victory must be corrected');
 const after={...save,...patch};
 assert.equal(after.fleetCampaign.bosses.r1.length,1);
 assert.deepEqual(after.fleetCampaign.treasures.r1,['t1','t2']);
 assert.ok(after.equipment.ownedShipIds.includes('galeao-halloween-tabuada'));
 assert.equal(after.equipment.equippedShipId,'galeao-halloween-tabuada');
 assert.equal(after.equipment.cannonCounts['royal-lion'],7);
 assert.equal(after.equipment.cannonCounts['spiked-war'],2);
 assert.equal(reconcileFleetBossPrizes(after),null,'must not grant twice');
});
test('no boss reward is granted before the boss actually falls',()=>{
 const save=initial();
 assert.equal(reconcileFleetBossPrizes(save),null);
 assert.equal(save.equipment.ownedShipIds.includes('galeao-halloween-tabuada'),false);
});
test('R2 fugitive awards its hunter ship and exactly two guided cannons',()=>{
 const save=initial();
 save.fleetCampaign.region=2;
 save.fleetCampaign.bosses={r2:['fugitive-frigate']};
 const patch=reconcileFleetBossPrizes(save);
 const after={...save,...patch};
 assert.equal(after.equipment.equippedShipId,'fragata-sombra-cacadora');
 assert.equal(after.equipment.cannonCounts['aetherion-mk1'],2);
 assert.ok(after.ammunition['aetherion-seeker']>=60000);
 assert.equal(reconcileFleetBossPrizes(after),null);
});
test('R5 Morbi awards the Golden Galleon only after its R5 victory',()=>{
 const save=initial();
 save.fleetCampaign.region=5;
 save.fleetCampaign.bosses={r5:['r2-morbi']};
 const patch=reconcileFleetBossPrizes(save);
 const after={...save,...patch};
 assert.ok(after.equipment.ownedShipIds.includes('galeao-dourado'));
 assert.equal(after.equipment.equippedShipId,'galeao-dourado');
 assert.equal(reconcileFleetBossPrizes(after),null);
});
test('every map edge and corner projects safely inside the ornamental radar circle',()=>{
 const width=4096,height=6500;
 for(const x of [0,150,2048,3950,width]){
  for(const y of [0,100,3250,6400,height]){
   const p=projectToMinimapCircle(x,y,width,height);
   const distance=Math.hypot(p.x-RADAR_CENTER,p.y-RADAR_CENTER);
   assert.ok(distance<=RADAR_RADIUS-8,'marker must stay inside the frame');
  }
 }
 const center=projectToMinimapCircle(width/2,height/2,width,height);
 assert.ok(Math.abs(center.x-RADAR_CENTER)<.001);
 assert.ok(Math.abs(center.y-RADAR_CENTER)<.001);
});
test('mandatory wreck obscured by minimap generates an external signal',()=>{
 const treasures=[{id:'under-hud',x:500,y:300},{id:'outside',x:300,y:200}];
 const screen=(x)=>x===500?{x:1250,y:150}:{x:100,y:150};
 const rect={left:1200,right:1400,top:40,bottom:250};
 const ping=findTreasuresBehindMinimap(treasures,screen,rect,{x:450,y:250});
 assert.equal(ping.treasure.id,'under-hud');
 assert.equal(ping.distance,71);
 assert.equal(findTreasuresBehindMinimap(treasures,screen,{left:0,right:20,top:0,bottom:20},{x:0,y:0}),null);
});
test('fleet HUD contains its independent exit hand and minimap wiring',()=>{
 const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/ui/app.css',import.meta.url),'utf8');
 assert.match(js,/Mão indicando a saída da região/);
 assert.match(js,/getExit:\s*\(\)\s*=>\s*world\.fleetNoRespawn/);
 assert.match(js,/reconcileFleetBossPrizes\(readSave\(\)\)/);
 assert.match(css,/\.minimap-hidden-treasure/);
});
