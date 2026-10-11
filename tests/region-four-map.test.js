import test from 'node:test';
import assert from 'node:assert/strict';
import { R2 } from '../src/world/regions/r2.js';
import { R3 } from '../src/world/regions/r3.js';
import { R4 } from '../src/world/regions/r4.js';
import { collidesWithIsland } from '../src/world/IslandCollision.js';

test('only Terras Gelidas gains 25 percent navigable area without moving old ports',()=>{
  assert.equal(R4.id,'r4');
  assert.equal(R4.name,'Terras Gélidas');
  assert.equal(R4.width,R2.width);
  assert.equal(R4.height,6400);
  assert.equal(R4.width*R4.height,R2.width*R2.height*1.25);
  assert.equal(R2.height,5120);
  assert.equal(R3.height,5120);
  assert.deepEqual(R4.spawn,R2.spawn);
  for(const kind of ['missions','shipyard']){
    const old=R2.islands.find(i=>i.kind===kind);
    const updated=R4.islands.find(i=>i.kind===kind);
    assert.deepEqual([updated.id,updated.x,updated.y,updated.size,updated.width,updated.height],
      [old.id,old.x,old.y,old.size,old.width,old.height]);
  }
});

test('existing forgotten island uses winter art and a second one occupies new southern sea',()=>{
  assert.equal(R4.islands.length,R2.islands.length+1);
  const original=R4.islands.find(i=>i.id==='r2-scenery-north');
  const added=R4.islands.find(i=>i.id==='r4-forgotten-south');
  assert.equal(original?.name,'Ilha Esquecida Invernal');
  assert.equal(added?.name,'Segunda Ilha Esquecida');
  for(const island of [original,added]){
    assert.ok(island);
    assert.equal(island.kind,'decoration');
    assert.match(decodeURI(island.asset),/Ilha Invernal de Gelo e Neve\.png$/);
    assert.ok(island.fallbackAsset);
    assert.ok(island.x>island.width/2 && island.x<R4.width-island.width/2);
    assert.ok(island.y>island.height/2 && island.y<R4.height-island.height/2);
    assert.equal(collidesWithIsland(R4,island.x,island.y,0),true);
  }
  assert.ok(added.y>R2.height);
  assert.deepEqual(R2.islands.find(i=>i.id==='r2-scenery-north').asset,original.fallbackAsset);
  assert.equal(R4.islands.filter(i=>i.kind==='decoration').length,3);
  assert.equal(collidesWithIsland(R4,R4.spawn.x,R4.spawn.y,32),false);
  for(const island of R4.islands){
    if(island.id===added.id)continue;
    assert.equal(Math.abs(added.x-island.x)>((added.width+island.width)/2)
      ||Math.abs(added.y-island.y)>((added.height+island.height)/2),true);
  }
});
