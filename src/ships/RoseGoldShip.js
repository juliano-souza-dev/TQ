export const ROSE_GOLD_SHIP = Object.freeze({
  id: 'galeao-rosas-de-ouro',
  name: 'Galeão Rosas de Ouro',
  maxHealth: 120,
  cannonSlots: 5,
  speed: Object.freeze({ min: 80, initial: 100, max: 160 }),
  sprite: Object.freeze({
    path: '../../assets/ships/galeao-rosas-de-ouro.webp',
    frameWidth: 400, frameHeight: 400, columns: 4, rows: 4,
    angleStepDegrees: 22.5,
    // Índices do atlas 4x4: 4=N, 8=L, 12=S, 0=O. Progressão horária de 22,5°.
    framesByHeading: [4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3],
  }),
});
