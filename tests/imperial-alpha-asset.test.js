import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {IMPERIAL_BLACK_GALLEON_SHIP} from '../src/ships/ImperialBlackGalleonShip.js';

test('Imperial Galleon spritesheet ships with real WebP alpha and unchanged 16 frames',()=>{
  const ship=IMPERIAL_BLACK_GALLEON_SHIP;
  assert.equal(ship.sprite.frameWidth,400);
  assert.equal(ship.sprite.frameHeight,400);
  assert.equal(ship.sprite.columns,4);
  assert.equal(ship.sprite.rows,4);
  assert.equal(ship.sprite.frameCount,16);
  assert.equal(ship.sprite.framesByHeading.length,16);
  assert.equal(ship.sprite.path,'../../assets/ships/galeao-negro-imperial-transparente.webp');
  const path=new URL('../assets/ships/galeao-negro-imperial-transparente.webp',import.meta.url);
  const webp=readFileSync(path);
  assert.equal(webp.toString('ascii',0,4),'RIFF');
  assert.equal(webp.toString('ascii',8,12),'WEBP');
  assert.equal(webp.toString('ascii',12,16),'VP8X','must use extended format with alpha support');
  assert.ok(webp[20]&0x10,'actual alpha transparency flag must be set');
  const w=1+webp.readUIntLE(24,3);
  const h=1+webp.readUIntLE(27,3);
  assert.equal(w,1600);
  assert.equal(h,1600);
  assert.ok(statSync(path).size<1_000_000,'optimized asset must remain mobile friendly');
});
