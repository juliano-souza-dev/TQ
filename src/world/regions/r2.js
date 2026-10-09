import { R1 } from './r1.js';

// Região 2 inicial: mapa navegável independente até receber ilhas e missões próprias.
export const R2 = Object.freeze({
  id: 'r2',
  name: 'Costa dos Corsários',
  width: 4096,
  height: 4096,
  spawn: Object.freeze({ x: 180, y: 1100 }),
  islands: Object.freeze([]),
  ocean: Object.freeze({ ...R1.ocean }),
});
