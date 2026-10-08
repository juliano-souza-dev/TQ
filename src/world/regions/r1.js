const versionedAsset = path => { const url = new URL(path, import.meta.url); if (globalThis.__TQ_ASSET_VERSION__) url.searchParams.set('v', globalThis.__TQ_ASSET_VERSION__); return url.href; };
// World configuration only. Shared textures live in assets/globals.
export const R1 = Object.freeze({
  id: 'r1',
  name: 'Enseada dos Aprendizes',
  width: 4096,
  height: 4096,
  spawn: Object.freeze({ x: 3400, y: 3500 }),
  islands: Object.freeze([
    Object.freeze({ id: 'shipyard', kind: 'shipyard', x: 1430, y: 1650, size: 1050, width: 820, height: 690, asset: versionedAsset('../../../assets/regions/islands/ilha_estaleiro.webp') }),
    Object.freeze({ id: 'missions', kind: 'missions', x: 2760, y: 1750, size: 1050, width: 820, height: 690, asset: versionedAsset('../../../assets/regions/islands/ilha_missoes.webp') }),
    Object.freeze({ id: 'scenery', kind: 'decoration', x: 2180, y: 2950, size: 1150, width: 900, height: 740, asset: versionedAsset('../../../assets/regions/islands/ilha_fundo_transparente.png') }),
  ]),
  ocean: Object.freeze({
    texture: versionedAsset('../../../assets/globals/ocean-tile-tabuada-region01.webp'),
    tileSize: 590,
    flowX: 0.012,
    flowY: 0.008,
    waveStrength: 0.008,
  }),
});
