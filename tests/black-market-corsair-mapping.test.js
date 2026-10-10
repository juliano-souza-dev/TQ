import test from 'node:test';
import assert from 'node:assert/strict';
import { BLACK_MARKET_CORSAIR_MAPPING } from '../src/ships/BlackMarketCorsairMapping.js';
import { BLOOD_RED_CORSAIR_SHIP } from '../src/ships/BloodRedCorsairShip.js';
import { BLACK_VEIL_CORSAIR_SHIP } from '../src/ships/BlackVeilCorsairShip.js';

const lateralFrames = new Map([
  [0,'port'],[1,'port'],[2,'port'],[3,'port'],
  [5,'starboard'],[6,'starboard'],[7,'starboard'],[8,'starboard'],
  [9,'starboard'],[10,'starboard'],[11,'starboard'],
  [13,'port'],[14,'port'],[15,'port'],
]);

test('corsário do mercado negro preserva atlas 4x4 de 16 direções', () => {
  assert.equal(BLACK_MARKET_CORSAIR_MAPPING.frameWidth, 400);
  assert.equal(BLACK_MARKET_CORSAIR_MAPPING.frameHeight, 400);
  assert.equal(BLACK_MARKET_CORSAIR_MAPPING.frameCount, 16);
  assert.deepEqual(BLACK_MARKET_CORSAIR_MAPPING.framesByHeading,
    [4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]);
});

test('corsário do mercado negro mapeia dez origens por bateria lateral', () => {
  for (const [frame,side] of lateralFrames) {
    assert.equal(BLACK_MARKET_CORSAIR_MAPPING.cannonMuzzles[frame]?.[side]?.length, 10,
      'frame '+frame+' / '+side);
  }
  assert.equal(BLACK_MARKET_CORSAIR_MAPPING.cannonMuzzles[4], undefined);
  assert.equal(BLACK_MARKET_CORSAIR_MAPPING.cannonMuzzles[12], undefined);
});


test('Corsário Vermelho Sangue usa o asset enviado e o mapping compartilhado', () => {
  assert.equal(BLOOD_RED_CORSAIR_SHIP.sprite.path, '../../assets/ships/corsário-vermelho-sangue.webp');
  assert.equal(BLOOD_RED_CORSAIR_SHIP.sprite.frameWidth, 400);
  assert.equal(BLOOD_RED_CORSAIR_SHIP.sprite.frameHeight, 400);
  assert.equal(BLOOD_RED_CORSAIR_SHIP.sprite.frameCount, 16);
  assert.equal(BLOOD_RED_CORSAIR_SHIP.cannonSlots, 10);
  assert.equal(BLOOD_RED_CORSAIR_SHIP.sprite.cannonMuzzles, BLACK_MARKET_CORSAIR_MAPPING.cannonMuzzles);
});


test('Corsário do Véu Negro usa o asset enviado e o mapping compartilhado', () => {
  assert.equal(BLACK_VEIL_CORSAIR_SHIP.sprite.path, '../../assets/ships/Corsario_do_Veu_Negro_1600x1600.webp');
  assert.equal(BLACK_VEIL_CORSAIR_SHIP.sprite.frameWidth, 400);
  assert.equal(BLACK_VEIL_CORSAIR_SHIP.sprite.frameHeight, 400);
  assert.equal(BLACK_VEIL_CORSAIR_SHIP.sprite.frameCount, 16);
  assert.equal(BLACK_VEIL_CORSAIR_SHIP.cannonSlots, 10);
  assert.equal(BLACK_VEIL_CORSAIR_SHIP.sprite.cannonMuzzles, BLACK_MARKET_CORSAIR_MAPPING.cannonMuzzles);
});
