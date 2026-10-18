import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FUTURE_FLEET_REGIONS} from '../src/world/regions/FutureFleetRegions.js';
import {collidesWithIsland} from '../src/world/IslandCollision.js';
import {createFleetPopulation} from '../src/npcs/FleetPopulation.js';
import {FLEET_REGIONS} from '../src/missions/FleetCampaign.js';

const r6=FUTURE_FLEET_REGIONS.r6;
const halloweenShips=new Set([
  'galeao-frota-das-aboboras','galeao-halloween-tabuada',
  'fantasma-esmeralda','corsario-vermelho-sangue',
  'sombra-fugitiva-verde-fantasma'
]);

test('Iron Strait removes decorative islands but keeps dark mission and shipyard ports',()=>{
  assert.equal(r6.islands.length,2);
  assert.deepEqual(r6.islands.map(i=>i.kind).sort(),['missions','shipyard']);
  for(const island of r6.islands){
    assert.equal(island.visualBrightness,.18);
    assert.equal(island.visualSaturation,.32);
    assert.ok(collidesWithIsland(r6,island.x,island.y),
      'ports remain collidable and usable');
  }
  assert.equal(FUTURE_FLEET_REGIONS.r5.islands.length,4,
    'Eclipse region islands remain unchanged');
  assert.equal(FUTURE_FLEET_REGIONS.r7.islands.length,4,
    'other future regions keep their islands');
  // Decorative-island collision geometry is gone in R6, avoiding invisible walls.
  assert.equal(collidesWithIsland(r6,700,4450,0),false);
  assert.equal(collidesWithIsland(r6,3380,4450,0),false);
});

test('R6 pirate waves use Halloween-themed NPC assets instead of frost watchmen',()=>{
  const world={region:r6,camera:{...r6.spawn},fleetNoRespawn:true,entities:new Map()};
  const created=createFleetPopulation(world,()=>.43,{
    fleetCampaign:{version:1,region:6,defeated:{}}
  });
  assert.equal(created,Math.ceil(FLEET_REGIONS.r6.enemyGoal/5));
  const raiders=[...world.entities.values()];
  assert.equal(new Set(raiders.map(n=>n.shipId)).size,5,
    'first wave showcases five distinct NPC ships');
  assert.ok(raiders.some(n=>n.shipId==='galeao-frota-das-aboboras'));
  assert.ok(raiders.some(n=>n.shipId==='galeao-halloween-tabuada'));
  for(const npc of raiders){
    assert.ok(halloweenShips.has(npc.shipId),npc.shipId);
    assert.ok(!/Geada|Gélido|Norte/.test(npc.name),npc.name);
    assert.ok(!['corsario-geada-negra','ladrao-da-geada','ladrao-do-norte'].includes(npc.shipId));
    assert.equal(npc.archetype,'fleet-raider');
    assert.ok(npc.maxHealth>0);
  }
  assert.equal(FLEET_REGIONS.r6.enemyGoal,22);
  assert.equal(FLEET_REGIONS.r6.encounters[0].id,'r6-imperial',
    'the final boss and campaign rewards are unchanged');
});

test('island darkness is region-specific and drawn without altering sprite assets',()=>{
  const src=readFileSync(new URL('../src/rendering/IslandRenderer.js',import.meta.url),'utf8');
  assert.ok(src.includes('Number.isFinite(island.visualBrightness)'));
  assert.ok(src.includes("this.ctx.filter='brightness('"));
  assert.ok(src.includes('this.ctx.restore()'));
  assert.ok(src.includes('else this.ctx.drawImage(image,'));
});
