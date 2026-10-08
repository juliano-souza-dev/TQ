// Cadastro isolado: sem spawn, equipagem, loja ou recompensa.
export const ECLIPSE_SHIP = Object.freeze({
  id: 'galeao-eclipse',
  name: 'Galeão Eclipse',
  description: 'Galeão de velas violetas com símbolos celestiais dourados.',
  status: 'catalog-only',
  cannonSlots: 10,
  speed: Object.freeze({ min: 330, initial: 330, max: 390 }),
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,
  sprite: Object.freeze({
    path: '../../assets/ships/eclipse.webp',
    frameWidth: 400, frameHeight: 400,
    columns: 4, rows: 4, frameCount: 16,
    angleStepDegrees: 22.5, headingZero: 'north', clockwise: true,
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
  }),
});
