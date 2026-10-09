const versionedAsset = path => { const url = new URL(path, import.meta.url); if (globalThis.__TQ_ASSET_VERSION__) url.searchParams.set('v', globalThis.__TQ_ASSET_VERSION__); return url.href; };
// World configuration only. Shared textures live in assets/globals.
const OCEAN_TEXTURE = versionedAsset('../../../assets/globals/ocean-tile-tabuada-region01.webp');
export const R1 = Object.freeze({
  id: 'r1',
  name: 'Enseada dos Aprendizes',
  width: 4096,
  height: 4096,
  spawn: Object.freeze({ x: 3400, y: 3500 }),
  exitPoint: Object.freeze({ x: 3950, y: 1100, radius: 115, toRegion: 2 }),
  islands: Object.freeze([
    Object.freeze({ id: 'shipyard', kind: 'shipyard', x: 690, y: 860, size: 1050, width: 820, height: 690, asset: versionedAsset('../../../assets/regions/islands/ilha_estaleiro.webp') }),
    Object.freeze({ id: 'missions', kind: 'missions', x: 3320, y: 860, size: 1050, width: 820, height: 690, asset: versionedAsset('../../../assets/regions/islands/ilha_missoes.webp') }),
    Object.freeze({ id: 'scenery', kind: 'decoration', x: 1950, y: 3520, size: 1150, width: 900, height: 740, asset: versionedAsset('../../../assets/regions/islands/ilha_fundo_transparente.png') }),
  ]),
  ocean: Object.freeze({
    // Identical source image to the old R1 (the Git blob SHA matches).
    texture: OCEAN_TEXTURE,
    background: OCEAN_TEXTURE,
    active: true,
    renderer: "webgl",
    preset: "calm",
    speed: 58,
    directionX: 1,
    directionY: 0.68,
    swell: 55,
    tileSize: 590,
    brightness: 62,
    saturation: 62,
    contrast: 72,
    tintR: 84,
    tintG: 79,
    tintB: 99,
    distortion: 20,
    waveFrequencyA: 24,
    waveFrequencyB: 29,
    waveMix: 56,
    foamMix: 48,
    sparkleIntensity: 18,
    sparkleSharpness: 32,
    layers: Object.freeze({
      deep: Object.freeze({ background: OCEAN_TEXTURE, parallax: 0.22, driftX: 7, driftY: 4, tileScale: 1.18, opacity: 1 }),
      wave: Object.freeze({ background: OCEAN_TEXTURE, parallax: 0.45, driftX: 18, driftY: 11, tileScale: 0.72, opacity: 0.34 }),
      foam: Object.freeze({ background: OCEAN_TEXTURE, parallax: 0.68, driftX: 36, driftY: 24, tileScale: 0.48, opacity: 0.2 }),
    }),
  }),
});
