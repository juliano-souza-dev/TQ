// World configuration only. Shared textures live in assets/globals.
export const R1 = Object.freeze({
  id: 'r1',
  name: 'Enseada dos Aprendizes',
  width: 4096,
  height: 4096,
  spawn: Object.freeze({ x: 2048, y: 2048 }),
  islands: Object.freeze([
    Object.freeze({ id: 'shipyard', kind: 'shipyard', x: 1430, y: 1650, size: 450, width: 450, height: 450, asset: new URL('../../../assets/regions/islands/ilha_estaleiro.webp', import.meta.url).href }),
    Object.freeze({ id: 'missions', kind: 'missions', x: 2760, y: 1750, size: 450, width: 450, height: 450, asset: new URL('../../../assets/regions/islands/ilha_missoes.webp', import.meta.url).href }),
    Object.freeze({ id: 'scenery', kind: 'decoration', x: 2180, y: 2950, size: 525, width: 525, height: 525, asset: new URL('../../../assets/regions/islands/ilha_fundo_transparente.png', import.meta.url).href }),
  ]),
  ocean: Object.freeze({
    texture: new URL('../../../assets/globals/ocean-tile-tabuada-region01.webp', import.meta.url).href,
    tileSize: 590,
    flowX: 0.012,
    flowY: 0.008,
    waveStrength: 0.008,
  }),
});
