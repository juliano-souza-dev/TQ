// NPC exclusivo da Costa dos Corsários. Não é vendável, equipável ou concedido ao jogador.
export const TERROR_DO_MAR_SHIP = Object.freeze({
  id: 'terror-do-mar',
  name: 'Terror do Mar',
  status: 'npc-only',
  playable: false,
  npcEnabled: true,
  shopEnabled: false,
  rewardEnabled: false,
  maxHealth: 500000,
  cannonSlots: 10,
  damage: 0,
  range: 0,
  speed: Object.freeze({ min: 45, initial: 70, max: 95 }),
  acceleration: 120,
  ai: Object.freeze({
    behavior: 'patrol',
    attackPlayer: false,
  }),
  sprite: Object.freeze({
    path: '../../assets/ships/terror do mar.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    // Atlas 4x4 mapeado no sentido horário.
    // Folha física: W, WNW, NW, NNW / N, NNE, NE, ENE /
    // E, ESE, SE, SSE / S, SSW, SW, WSW.
    // API do jogo: N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW.
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
  }),
});
