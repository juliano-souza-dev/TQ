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
    // Mapeamento do atlas atualmente publicado em sombra_fugitiva.webp.
    // O atlas de substituição requer atualização do próprio arquivo antes de ativar novos índices.
    framesByHeading: Object.freeze([15,13,11,10,5,3,2,1,0,1,2,3,5,7,9,13]),
    flipXByHeading: Object.freeze([
      false,false,false,false,true,true,true,true,
      false,false,false,false,false,false,false,true,
    ]),
  }),
});
