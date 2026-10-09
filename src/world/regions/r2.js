import { R1 } from './r1.js';

// 4096 × 5120 = 125% da área navegável de R1 (4096 × 4096).
// Os dois portos reutilizam exatamente os assets comerciais da Enseada.
const source = kind => R1.islands.find(island => island.kind === kind);
const port = (kind, x, y) => Object.freeze({
  ...source(kind), id: 'r2-' + kind, kind, x, y,
});
const scenery = (id, x, y, size, width, height) => Object.freeze({
  id, kind: 'decoration', x, y, size, width, height,
  asset: R1.islands.find(island => island.kind === 'decoration').asset,
});
export const R2 = Object.freeze({
  id: 'r2',
  name: 'Costa dos Corsários',
  width: 4096,
  height: 5120,
  spawn: Object.freeze({ x: 420, y: 860 }),
  islands: Object.freeze([
    port('missions', 690, 1620),
    port('shipyard', 3400, 1620),
    scenery('r2-scenery-north', 700, 4450, 1080, 900, 740),
    scenery('r2-scenery-south', 3380, 4450, 1020, 850, 690),
  ]),
  ocean: Object.freeze({
    ...R1.ocean,
    // Parâmetros efetivamente consumidos pelo WebGL do oceano.
    brightness: 115, saturation: 110, contrast: 93,
    tintR: 99, tintG: 123, tintB: 133,
    speed: 35, swell: 32, foamMix: 32,
    sparkleIntensity: 28,
  }),
});
