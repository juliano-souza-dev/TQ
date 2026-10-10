// Navio mapeado e mantido somente no catálogo técnico por enquanto.
// O asset foi recebido na conversa; o caminho abaixo é o destino esperado quando for enviado ao repositório.
export const CRIMSON_SKULL_GALLEON_SHIP = Object.freeze({
  id: 'galeao-caveira-rubra',
  name: 'Galeão da Caveira Rubra',
  description: 'Galeão corsário de velas rubras e negras, com iconografia de caveira.',
  status: 'catalog-only',
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,
  assetPending: true,
  cannonSlots: 7,
  cannonLayout: Object.freeze({
    port: 7,
    starboard: 7,
    bow: 0,
    stern: 0,
  }),
  sprite: Object.freeze({
    path: '../../assets/ships/galeao-caveira-rubra.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    headingZero: 'north',
    clockwise: true,
    // Folha física: W, WNW, NW, NNW / N, NNE, NE, ENE /
    // E, ESE, SE, SSE / S, SSW, SW, WSW.
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
    // Frames físicos 4 e 12 usam fallback por serem vistas axiais.
    cannonMuzzles: Object.freeze({
      0: { port: Object.freeze([[157,278],[181,279],[205,280],[229,280],[253,279],[277,278],[301,276]].map(Object.freeze)) },
      1: { port: Object.freeze([[145,258],[165,267],[185,276],[205,285],[226,294],[247,302],[269,309]].map(Object.freeze)) },
      2: { port: Object.freeze([[132,236],[148,247],[164,258],[181,270],[198,282],[216,294],[235,306]].map(Object.freeze)) },
      3: { port: Object.freeze([[132,223],[142,236],[152,249],[162,263],[172,277],[183,291],[194,305]].map(Object.freeze)) },

      5: { starboard: Object.freeze([[268,226],[258,239],[248,252],[238,265],[228,278],[217,291],[206,304]].map(Object.freeze)) },
      6: { starboard: Object.freeze([[282,238],[266,249],[250,260],[233,272],[216,284],[198,296],[179,307]].map(Object.freeze)) },
      7: { starboard: Object.freeze([[292,260],[271,268],[250,276],[229,284],[208,291],[187,298],[166,304]].map(Object.freeze)) },
      8: { starboard: Object.freeze([[305,276],[281,278],[257,279],[233,280],[209,280],[185,279],[161,278]].map(Object.freeze)) },
      9: { starboard: Object.freeze([[272,309],[251,301],[230,293],[209,284],[188,275],[168,266],[148,256]].map(Object.freeze)) },
      10:{ starboard: Object.freeze([[237,306],[218,294],[200,282],[183,270],[166,258],[150,247],[134,236]].map(Object.freeze)) },
      11:{ starboard: Object.freeze([[194,305],[183,291],[172,277],[162,263],[152,249],[142,236],[132,223]].map(Object.freeze)) },

      13:{ port: Object.freeze([[206,304],[217,291],[228,278],[238,265],[248,252],[258,239],[268,226]].map(Object.freeze)) },
      14:{ port: Object.freeze([[179,307],[198,296],[216,284],[233,272],[250,260],[266,249],[282,238]].map(Object.freeze)) },
      15:{ port: Object.freeze([[166,304],[187,298],[208,291],[229,284],[250,276],[271,268],[292,260]].map(Object.freeze)) },
    }),
  }),
});
