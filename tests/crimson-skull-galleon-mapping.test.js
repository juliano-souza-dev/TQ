import test from 'node:test';
import assert from 'node:assert/strict';
import { CRIMSON_SKULL_GALLEON_SHIP } from '../src/ships/CrimsonSkullGalleonShip.js';

const sideFrames = new Map([
  [0,'port'],[1,'port'],[2,'port'],[3,'port'],
  [5,'starboard'],[6,'starboard'],[7,'starboard'],[8,'starboard'],
  [9,'starboard'],[10,'starboard'],[11,'starboard'],
  [13,'port'],[14,'port'],[15,'port'],
]);

test('Galeão da Caveira Rubra preserva atlas 4x4 e 16 direções', () => {
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.sprite.frameWidth, 400);
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.sprite.frameHeight, 400);
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.sprite.frameCount, 16);
  assert.deepEqual(CRIMSON_SKULL_GALLEON_SHIP.sprite.framesByHeading,
    [4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]);
});

test('Galeão da Caveira Rubra mapeia sete origens em cada bateria lateral utilizável', () => {
  for (const [frame, side] of sideFrames) {
    assert.equal(CRIMSON_SKULL_GALLEON_SHIP.sprite.cannonMuzzles[frame]?.[side]?.length, 7,
      'frame ' + frame + ' / ' + side);
  }
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.sprite.cannonMuzzles[4], undefined);
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.sprite.cannonMuzzles[12], undefined);
});

test('Galeão da Caveira Rubra permanece fora de mapas por enquanto', () => {
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.status, 'catalog-only');
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.npcEnabled, false);
  assert.equal(CRIMSON_SKULL_GALLEON_SHIP.playable, false);
});
