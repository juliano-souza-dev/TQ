// Navio disponível apenas no catálogo, sem atribuição a jogadores ou NPCs.
export const GOLDEN_GALLEON_SHIP = Object.freeze({
  id: 'galeao-dourado',
  name: 'Galeão Dourado',
  description: 'Galeão ornamentado com casco dourado e velas vermelhas.',
  status: 'catalog-only',
  cannonSlots: 10,
  speed: Object.freeze({ min: 250, initial: 250, max: 310 }),
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,
  sprite: Object.freeze({
    path: '../../assets/ships/galeão dourdado.webp',
    frameWidth: 400, frameHeight: 400, columns: 4, rows: 4,
    frameCount: 16, angleStepDegrees: 22.5,
    headingZero: 'north', clockwise: true,
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
  }),
});
