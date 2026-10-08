// World configuration only. Shared textures live in assets/globals.
export const R1 = Object.freeze({
  id: 'r1',
  name: 'Enseada dos Aprendizes',
  width: 4096,
  height: 4096,
  spawn: Object.freeze({ x: 2048, y: 2048 }),
  ocean: Object.freeze({
    texture: new URL('../../../assets/globals/ocean-tile-tabuada-region01.webp', import.meta.url).href,
    tileSize: 590,
    flowX: 0.012,
    flowY: 0.008,
    waveStrength: 0.008,
  }),
});
