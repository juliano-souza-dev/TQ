import test from 'node:test';
import assert from 'node:assert/strict';
import { spriteCannonMuzzle } from '../src/ships/CannonMuzzleMap.js';
import { ROSE_GOLD_SHIP } from '../src/ships/RoseGoldShip.js';
import { STARTER_SHIP } from '../src/ships/StarterShip.js';
import { getShipFrame } from '../src/ships/ShipRegistry.js';

const size = { width: 240, height: 240 };
const player = { x: 600, y: 600 };
const frameSides = new Map([
  [0, 'port'], [1, 'port'], [2, 'port'], [3, 'port'],
  [5, 'starboard'], [6, 'starboard'], [7, 'starboard'],
  [8, 'starboard'], [9, 'starboard'], [10, 'starboard'],
  [11, 'starboard'], [13, 'port'], [14, 'port'], [15, 'port'],
]);
function targetOnSide(heading, side) {
  const angle = heading * Math.PI / 180;
  const sign = side === 'starboard' ? 1 : -1;
  return { x: player.x + Math.cos(angle) * sign * 500,
    y: player.y + Math.sin(angle) * sign * 500 };
}
test('Rosas de Ouro utiliza as cinco bocas visíveis de cada quadro marcado', () => {
  for (let frame = 0; frame < 16; frame++) {
    const heading = ((frame - 4 + 16) % 16) * 22.5;
    assert.equal(getShipFrame(heading, ROSE_GOLD_SHIP), frame);
    const side = frameSides.get(frame);
    if (!side) continue;
    const target = targetOnSide(heading, side);
    const muzzles = ROSE_GOLD_SHIP.sprite.cannonMuzzles[frame][side];
    for (let slot = 0; slot < 5; slot++) {
      const mapped = spriteCannonMuzzle(ROSE_GOLD_SHIP, player, target, heading, slot, size);
      assert.ok(mapped, 'Boca presente, quadro ' + frame + ', slot ' + slot);
      assert.ok(Math.abs(mapped.x - (player.x + (muzzles[slot][0] / 400 - .5) * size.width)) < .001);
      assert.ok(Math.abs(mapped.y - (player.y + (muzzles[slot][1] / 400 - .5) * size.height)) < .001);
    }
  }
});
test('sem mapeamento mantém o hardpoint padrão (null)', () => {
  assert.equal(spriteCannonMuzzle(ROSE_GOLD_SHIP, player, { x: 600, y: 100 }, 0, 0, size), null,
    'Norte é quadro 4: vista de popa sem bocas verificáveis');
  assert.equal(spriteCannonMuzzle(ROSE_GOLD_SHIP, player, { x: 600, y: 900 }, 180, 0, size), null,
    'Sul é quadro 12: vista de proa sem bocas verificáveis');
  assert.equal(spriteCannonMuzzle(ROSE_GOLD_SHIP, player, targetOnSide(90, 'port'), 90, 0, size), null,
    'Lado encoberto não deve inventar boca de canhão');
  assert.equal(spriteCannonMuzzle(STARTER_SHIP, player, targetOnSide(90, 'starboard'), 90, 0, size), null,
    'Navios sem mapa permanecem no cálculo legado');
});
test('mapeamento acompanha o tamanho exibido do sprite e não ultrapassa slots', () => {
  const target = targetOnSide(90, 'starboard');
  const small = spriteCannonMuzzle(ROSE_GOLD_SHIP, player, target, 90, 2, {width:120,height:120});
  const large = spriteCannonMuzzle(ROSE_GOLD_SHIP, player, target, 90, 2, {width:240,height:240});
  assert.ok(Math.abs((small.x-player.x)*2 - (large.x-player.x)) < .001);
  assert.ok(Math.abs((small.y-player.y)*2 - (large.y-player.y)) < .001);
  assert.equal(spriteCannonMuzzle(ROSE_GOLD_SHIP, player, target, 90, 5, size), null);
});
