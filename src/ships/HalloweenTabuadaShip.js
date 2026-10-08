// Navio registrado exclusivamente no catálogo. Não integrar à frota, NPCs ou recompensas.
export const HALLOWEEN_TABUADA_SHIP = Object.freeze({
  id: 'galeao-halloween-tabuada',
  name: 'Galeão Halloween da Tabuada',
  description: 'Galeão pirata de Halloween com velas ilustradas por multiplicações.',
  status: 'catalog-only',
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,
  sprite: Object.freeze({
    path: '../../assets/ships/navio_pirata_halloween_tabuada_400x400.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    headingZero: 'north',
    clockwise: true,
    // Atlas S01–S16 em ordem de leitura. Norte corresponde a S05.
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
  }),
});
