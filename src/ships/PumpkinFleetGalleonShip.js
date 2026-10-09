// Navio de Halloween registrado somente no catálogo.
// Não inserir em mapa, frota do jogador, loja ou recompensas sem regra específica.
export const PUMPKIN_FLEET_GALLEON_SHIP = Object.freeze({
  id: 'galeao-frota-das-aboboras',
  name: 'Galeão da Frota das Abóboras',
  description: 'Galeão de Halloween com velas roxas e laranjas e portinholas decoradas com abóboras.',
  status: 'catalog-only',
  cannonSlots: 8,
  cannonLayout: Object.freeze({
    port: 4,
    starboard: 4,
    bow: 0,
    stern: 0,
  }),
  speed: Object.freeze({ min: 260, initial: 260, max: 320 }),
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,
  sprite: Object.freeze({
    path: '../../assets/ships/geleao-frota-dos-aboboras.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    headingZero: 'north',
    clockwise: true,

    // Atlas em ordem de leitura, já alinhado ao heading do TQ:
    // 00=N, 01=NNE, 02=NE, 03=ENE,
    // 04=E, 05=ESE, 06=SE, 07=SSE,
    // 08=S, 09=SSW, 10=SW, 11=WSW,
    // 12=W, 13=WNW, 14=NW, 15=NNW.
    framesByHeading: Object.freeze([
      0,1,2,3,
      4,5,6,7,
      8,9,10,11,
      12,13,14,15,
    ]),
  }),
});
