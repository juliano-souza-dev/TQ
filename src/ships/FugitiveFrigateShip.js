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
    // Mapeamento inspecionado no atlas 4x4 (índices 0..15, linha a linha).
    // 0: proa para baixo (Sul); 5: proa para esquerda (Oeste);
    // 11: proa para cima/direita (Nordeste); 15: popa próxima (Norte).
    // A folha não contém 16 ângulos uniformes de 360°. Alguns quadros
    // são reutilizados e refletidos para cobrir o lado ausente.
    // Heading: N, NNE, NE, ENE, L, ESE, SE, SSE, S, SSW, SO, OSO, O, ONO, NO, NNO.
    framesByHeading: Object.freeze([15,13,11,10,5,3,2,1,0,1,2,3,5,7,9,13]),
    flipXByHeading: Object.freeze([
      false,false,false,false,true,true,true,true,
      false,false,false,false,false,false,false,true,
    ]),
  }),
});
