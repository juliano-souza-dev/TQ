export const ROSE_GOLD_SHIP = Object.freeze({
  id: 'galeao-rosas-de-ouro',
  name: 'Galeão Rosas de Ouro',
  maxHealth: 120,
  cannonSlots: 3,
  speed: Object.freeze({ min: 80, initial: 100, max: 160 }),
  sprite: Object.freeze({
    path: '../../assets/ships/galeão-rosas-de-ouro.png',
    frameWidth: 400, frameHeight: 400, columns: 4, rows: 4,
    angleStepDegrees: 22.5,
    framesByHeading: [3,4,5,6,7,8,9,10,11,12,13,14,15,0,1,2],
    chromaKey: [6, 30, 47],
  }),
});
