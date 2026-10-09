// Navio disponível apenas no catálogo, sem atribuição a jogadores ou NPCs.
export const GOLDEN_GALLEON_SHIP = Object.freeze({
  id: 'galeao-dourado',
  name: 'Galeão Dourado',
  description: 'Galeão ornamentado com casco dourado e velas vermelhas.',
  status: 'catalog-only',
  cannonSlots: 7,
  cannonLayout: Object.freeze({
    port: 7,
    starboard: 7,
    bow: 0,
    stern: 0,
  }),
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

    // Coordenadas [x,y] no quadro 400x400.
    // Frames físicos 4 (N) e 12 (S) usam fallback geométrico porque
    // a vista axial não expõe uma bateria lateral verificável.
    cannonMuzzles: Object.freeze({
      0: { port: Object.freeze([[138,287],[165,288],[192,289],[220,290],[247,290],[275,289],[302,287]].map(Object.freeze)) },
      1: { port: Object.freeze([[132,261],[154,271],[177,280],[201,290],[225,298],[250,306],[276,313]].map(Object.freeze)) },
      2: { port: Object.freeze([[120,229],[135,241],[152,254],[169,267],[187,281],[206,295],[226,309]].map(Object.freeze)) },
      3: { port: Object.freeze([[118,223],[127,237],[137,251],[147,266],[157,280],[168,294],[179,308]].map(Object.freeze)) },

      5: { starboard: Object.freeze([[274,223],[264,237],[254,251],[244,265],[234,279],[223,293],[212,307]].map(Object.freeze)) },
      6: { starboard: Object.freeze([[281,228],[266,241],[250,254],[233,268],[216,282],[198,295],[179,308]].map(Object.freeze)) },
      7: { starboard: Object.freeze([[301,261],[276,270],[251,279],[227,286],[203,292],[179,296],[155,298]].map(Object.freeze)) },
      8: { starboard: Object.freeze([[310,286],[282,287],[255,288],[228,289],[201,289],[174,288],[147,286]].map(Object.freeze)) },
      9: { starboard: Object.freeze([[292,313],[267,305],[243,296],[220,288],[197,279],[175,270],[154,260]].map(Object.freeze)) },
      10:{ starboard: Object.freeze([[243,312],[224,299],[205,286],[187,273],[170,260],[154,247],[139,235]].map(Object.freeze)) },
      11:{ starboard: Object.freeze([[189,309],[178,295],[168,281],[159,267],[149,253],[140,239],[131,225]].map(Object.freeze)) },

      13:{ port: Object.freeze([[220,310],[204,297],[189,284],[174,271],[159,258],[145,245],[132,232]].map(Object.freeze)) },
      14:{ port: Object.freeze([[250,312],[229,300],[208,288],[188,276],[169,264],[151,252],[134,240]].map(Object.freeze)) },
      15:{ port: Object.freeze([[306,286],[279,283],[252,280],[225,278],[198,276],[171,274],[144,272]].map(Object.freeze)) },
    }),
  }),
});
