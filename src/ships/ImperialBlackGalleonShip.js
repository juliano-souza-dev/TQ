// Galeão pesado registrado no catálogo. Não é inserido em mapas, loja,
// recompensas ou frota do jogador enquanto não houver regra específica.
export const IMPERIAL_BLACK_GALLEON_SHIP = Object.freeze({
  id: 'galeao-negro-imperial',
  name: 'Galeão Negro Imperial',
  description: 'Galeão pesado de linha, com velas negras, casco dourado e duas baterias laterais visíveis.',
  status: 'catalog-only',
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,

  cannonSlots: 10,
  cannonLayout: Object.freeze({
    port: 10,
    starboard: 10,
    bow: 0,
    stern: 0,
  }),
  visualGunports: Object.freeze({
    port: Object.freeze({ upper: 9, lower: 8 }),
    starboard: Object.freeze({ upper: 9, lower: 8 }),
  }),

  speed: Object.freeze({ min: 120, initial: 145, max: 180 }),

  sprite: Object.freeze({
    path: '../../assets/ships/galeao-negro-imperial.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    headingZero: 'north',
    clockwise: true,

    // Atlas físico:
    // 00=W, 01=WNW, 02=NW, 03=NNW,
    // 04=N, 05=NNE, 06=NE, 07=ENE,
    // 08=E, 09=ESE, 10=SE, 11=SSE,
    // 12=S, 13=SSW, 14=SW, 15=WSW.
    framesByHeading: Object.freeze([
      4,5,6,7,
      8,9,10,11,
      12,13,14,15,
      0,1,2,3,
    ]),

    frameBounds: Object.freeze([
      [23,39,377,353],
      [27,32,375,369],
      [23,24,377,378],
      [50,22,355,378],
      [112,22,290,379],
      [74,24,366,364],
      [29,26,376,373],
      [31,33,379,368],
      [26,38,379,349],
      [28,28,376,364],
      [45,29,377,374],
      [80,35,358,365],
      [117,22,284,378],
      [75,24,351,374],
      [26,21,376,372],
      [25,32,378,358],
    ].map(Object.freeze)),

    // Centro óptico médio ~= (206,220).
    alignmentOffsets: Object.freeze([
      [15,27], [12,12], [12,0], [0,-9],
      [-5,-5], [-3,-10], [-14,3], [-12,12],
      [-16,25], [-13,0], [-10,-6], [-3,-20],
      [-6,-20], [11,-19], [15,-1], [16,12],
    ].map(Object.freeze)),

    // [x,y] no quadro 400x400. Frames 4 (popa) e 12 (proa) usam o
    // fallback geométrico do motor para não inventar boca de canhão oculta.
    cannonMuzzles: Object.freeze({
      0: { port: Object.freeze([[128,309],[176,312],[224,314],[272,314],[319,309],[137,323],[183,329],[230,331],[276,330],[307,325]].map(Object.freeze)) },
      1: { port: Object.freeze([[136,274],[174,290],[212,304],[250,315],[291,322],[147,289],[184,305],[220,318],[257,327],[296,333]].map(Object.freeze)) },
      2: { port: Object.freeze([[130,260],[162,277],[194,292],[227,305],[263,316],[139,275],[171,292],[202,307],[234,319],[270,328]].map(Object.freeze)) },
      3: { port: Object.freeze([[136,253],[158,272],[181,291],[205,309],[230,324],[143,267],[166,286],[190,305],[214,321],[238,335]].map(Object.freeze)) },

      5: { starboard: Object.freeze([[151,312],[176,302],[202,291],[227,279],[251,265],[148,329],[173,319],[198,308],[223,296],[248,283]].map(Object.freeze)) },
      6: { starboard: Object.freeze([[122,302],[158,297],[194,291],[230,283],[267,273],[125,322],[161,316],[197,309],[233,300],[270,289]].map(Object.freeze)) },
      7: { starboard: Object.freeze([[103,300],[145,299],[187,297],[229,292],[272,283],[106,321],[148,320],[190,317],[232,311],[275,301]].map(Object.freeze)) },
      8: { starboard: Object.freeze([[104,307],[151,309],[199,310],[247,309],[297,305],[113,325],[160,328],[207,329],[254,327],[301,322]].map(Object.freeze)) },
      9: { starboard: Object.freeze([[84,269],[123,282],[162,293],[202,302],[243,309],[91,286],[131,300],[171,311],[211,319],[251,325]].map(Object.freeze)) },
      10:{ starboard: Object.freeze([[86,241],[114,263],[143,284],[173,302],[204,316],[92,257],[121,279],[151,300],[181,317],[212,331]].map(Object.freeze)) },
      11:{ starboard: Object.freeze([[93,213],[107,239],[122,265],[137,289],[154,311],[100,228],[114,254],[129,280],[144,303],[161,324]].map(Object.freeze)) },

      13:{ port: Object.freeze([[259,217],[247,242],[233,267],[218,291],[202,312],[252,232],[240,257],[226,282],[211,306],[194,325]].map(Object.freeze)) },
      14:{ port: Object.freeze([[307,267],[278,281],[249,293],[220,304],[188,313],[313,282],[284,296],[255,308],[226,318],[194,326]].map(Object.freeze)) },
      15:{ port: Object.freeze([[316,285],[276,296],[236,304],[196,310],[157,312],[321,301],[281,312],[241,319],[201,324],[162,325]].map(Object.freeze)) },
    }),
  }),
});
