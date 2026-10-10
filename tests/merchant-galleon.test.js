import test from 'node:test';
import assert from 'node:assert/strict';
import { BLACK_MARKET_SHIP, NPC_SHIP_CATALOG, getShipFrame } from '../src/ships/ShipRegistry.js';

test('galeão mercador usa atlas 4x4 com dezesseis direções', () => {
  assert.equal(BLACK_MARKET_SHIP.name,'Galeão Mercador da Caveira Rubra');
  assert.equal(BLACK_MARKET_SHIP.sprite.path,'../../assets/ships/galeao_pirata_mercador.webp');
  assert.equal(BLACK_MARKET_SHIP.sprite.columns,4);
  assert.equal(BLACK_MARKET_SHIP.sprite.rows,4);
  assert.equal(BLACK_MARKET_SHIP.sprite.frameCount,16);
  assert.equal(getShipFrame(0,BLACK_MARKET_SHIP),4);
  assert.equal(getShipFrame(90,BLACK_MARKET_SHIP),8);
  assert.equal(getShipFrame(180,BLACK_MARKET_SHIP),12);
  assert.equal(getShipFrame(270,BLACK_MARKET_SHIP),0);
});

test('galeão mercador possui três canhões por bordo e está no catálogo NPC', () => {
  assert.equal(BLACK_MARKET_SHIP.cannonLayout.port,3);
  assert.equal(BLACK_MARKET_SHIP.cannonLayout.starboard,3);
  assert.equal(BLACK_MARKET_SHIP.cannonSlots,3);
  assert.ok(BLACK_MARKET_SHIP.sprite.cannonMuzzles[0].port.length===3);
  assert.ok(BLACK_MARKET_SHIP.sprite.cannonMuzzles[8].starboard.length===3);
  assert.ok(NPC_SHIP_CATALOG.some(ship=>ship.id===BLACK_MARKET_SHIP.id));
});


test('mercador patrulha fora das missões de coordenada fixa', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8'));
  assert.match(source,/marketMissionFixed=\['r2-black-market','r2-hunt-prep'\]/);
  assert.match(source,/blackMarketMerchantOrbitAngle/);
  assert.match(source,/orbitRadiusX=620,orbitRadiusY=430/);
  assert.match(source,/marketMerchant\.state='roaming'/);
  assert.match(source,/marketMerchant\.x=marketAnchorX/);
  assert.match(source,/marketMerchant\.y=marketAnchorY/);
});
