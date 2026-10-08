export const STARTER_SHIP = Object.freeze({
  id: 'starter-red-sails',
  name: 'Galeão das Velas Rubras',
  starterShip: true,
  maxHealth: 100,
  cannonSlots: 2,
  speed: Object.freeze({ min: 80, initial: 100, max: 160 }),
  sprite: {
    path: '../../assets/ships/Sprite Sheet de Galeões Piratas em Fundo Transparente (2).png',
    frameWidth: 400, frameHeight: 400, columns: 4, rows: 4,
    angleStepDegrees: 22.5,
    framesByHeading: [4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3],
  },
});
