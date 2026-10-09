// Navio NPC de evasão. Não é concedida, vendida ou equipável pelo jogador.
export const FUGITIVE_FRIGATE_SHIP = Object.freeze({
  id: 'fragata-sombra-fugitiva',
  name: 'Ladrão da Sombra',
  status: 'npc-only',
  playable: false,
  npcEnabled: true,
  shopEnabled: false,
  rewardEnabled: false,
  healthRange: Object.freeze({ min: 120, max: 220 }),
  maxHealth: 220,
  cannonSlots: 0,
  damage: 0,
  range: 0,
  speed: Object.freeze({ min: 260, initial: 300, max: 480 }),
  acceleration: 420,
  ai: Object.freeze({
    behavior: 'flee',
    detectionRange: 520,
    disengageRange: 700,
  }),
  sprite: Object.freeze({
    path: '../../assets/ships/sombra_fugitiva.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    // Novo atlas 4x4: quadro 0 aponta para Oeste (270 graus),
    // avançando 22,5 graus por célula na ordem das linhas.
    // Heading: N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW.
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
    flipXByHeading: Object.freeze(Array(16).fill(false)),
  }),
});
