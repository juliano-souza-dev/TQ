import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FUTURE_FLEET_REGIONS} from '../src/world/regions/FutureFleetRegions.js';
import {normalizeOceanConfig} from '../src/world/WorldOceanEffect.mjs';
import {FLEET_REGIONS} from '../src/missions/FleetCampaign.js';
import {HALLOWEEN_FOG_FRAGMENT_SHADER} from '../src/rendering/shaders/halloweenFog.js';
import {HalloweenFogRenderer} from '../src/rendering/HalloweenFogRenderer.js';

test('R6 Iron Strait is an even darker post-Eclipse night while later map presets remain untouched',()=>{
  const eclipse=normalizeOceanConfig(FUTURE_FLEET_REGIONS.r5.ocean);
  const strait=normalizeOceanConfig(FUTURE_FLEET_REGIONS.r6.ocean);
  const next=normalizeOceanConfig(FUTURE_FLEET_REGIONS.r7.ocean);
  assert.equal(eclipse.night,true);
  assert.equal(strait.night,true);
  assert.equal(eclipse.brightness,28,'do not change R5 darkness');
  assert.ok(strait.brightness<eclipse.brightness);
  for(const ch of ['tintR','tintG','tintB'])
    assert.ok(strait[ch]<eclipse[ch],ch+' should be darker than the Eclipse');
  assert.ok(strait.sparkleIntensity<eclipse.sparkleIntensity);
  assert.equal(FUTURE_FLEET_REGIONS.r6.atmosphere.kind,'cold-night-mist');
  assert.ok(FUTURE_FLEET_REGIONS.r6.atmosphere.intensity<=.8);
  assert.equal(next.night,false,'do not accidentally darken unrelated future regions');
  assert.equal(FLEET_REGIONS.r6.enemyGoal,22);
  assert.equal(FLEET_REGIONS.r6.monsterGoal,2);
});

test('R6 cool fog reuses world-anchored shader and leaves green fog default unchanged',()=>{
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER,/uniform float uMistPalette;/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER,/vec3 moonBlue/);
  assert.match(HALLOWEEN_FOG_FRAGMENT_SHADER,/vec2 world = uCamera/);
  assert.ok(HALLOWEEN_FOG_FRAGMENT_SHADER.includes('mix(0.42, 0.27, cold)'));
  const canvas={addEventListener:()=>{}};
  assert.equal(new HalloweenFogRenderer(canvas).palette,'green');
  assert.equal(new HalloweenFogRenderer(canvas,{palette:'cold-night'}).palette,'cold-night');
  assert.equal(new HalloweenFogRenderer(canvas,{palette:'unknown'}).palette,'green');
});

test('main world pipeline activates R6 mist but preserves R3 event/purification and projectile layers',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/ui/app.css',import.meta.url),'utf8');
  assert.ok(main.includes("world.region.atmosphere?.kind === 'cold-night-mist'"));
  assert.ok(main.includes('useGreenMist || useColdNightMist'));
  assert.ok(main.includes("palette: useColdNightMist ? 'cold-night' : 'green'"));
  assert.ok(main.includes('halloweenFogCanvas.hidden=!fogVisible'));
  assert.ok(main.includes("world.region.id==='r3'&&r3Purification<0.999"));
  assert.ok(css.includes('.halloween-fog-layer.cold-night-fog-layer.halloween-fog-fallback'));
});
