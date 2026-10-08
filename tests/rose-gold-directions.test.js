import test from 'node:test';
import assert from 'node:assert/strict';
import { getShipFrame } from '../src/ships/ShipRegistry.js';
import { ROSE_GOLD_SHIP } from '../src/ships/RoseGoldShip.js';

// A imagem 4x4 começa na direção oeste e gira no sentido horário.
// O quadro 4 é a primeira direção norte (0°) do jogo.
test('Rosas de Ouro corresponde às 16 direções sem salto de quadro', () => {
  const expected = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3];
  for (let step = 0; step < 16; step++) {
    assert.equal(getShipFrame(step * 22.5, ROSE_GOLD_SHIP), expected[step],
      'Direção ' + step * 22.5 + '°');
  }
  assert.equal(getShipFrame(360, ROSE_GOLD_SHIP), 4);
  assert.equal(getShipFrame(-90, ROSE_GOLD_SHIP), 0);
  assert.equal(getShipFrame(90, ROSE_GOLD_SHIP), 8);
  assert.equal(getShipFrame(180, ROSE_GOLD_SHIP), 12);
});
