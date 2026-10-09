// Terror da Tabuada: galeão de missão, NPC especial e recompensa equipável.
export const HALLOWEEN_TABUADA_SHIP = Object.freeze({
  id: 'galeao-halloween-tabuada',
  name: 'Terror da Tabuada',
  description: 'Galeão pirata de Halloween com velas ilustradas por multiplicações.',
  status: 'reward',
  maxHealth: 120,
  cannonSlots: 7,
  cannonLayout: Object.freeze({
    port: 7,
    starboard: 7,
    bow: 0,
    stern: 0,
  }),
  speed: Object.freeze({ min: 300, initial: 300, max: 360 }),
  playable: true,
  npcEnabled: true,
  shopEnabled: false,
  rewardEnabled: true,
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

    // Coordenadas [x,y] no quadro 400x400. Frames físicos 4 (N) e 12 (S)
    // ficam no hardpoint geométrico porque a vista axial não expõe uma
    // bateria lateral verificável sem deslocar o disparo para vela/ornamento.
    cannonMuzzles: Object.freeze({
      0: { port: Object.freeze([[114,278],[139,279],[165,280],[191,281],[217,281],[243,280],[269,278]].map(Object.freeze)) },
      1: { port: Object.freeze([[117,252],[137,261],[158,270],[180,279],[203,288],[227,296],[252,304]].map(Object.freeze)) },
      2: { port: Object.freeze([[120,223],[133,234],[147,246],[162,258],[178,270],[195,282],[213,294]].map(Object.freeze)) },
      3: { port: Object.freeze([[128,226],[136,239],[145,252],[154,265],[163,278],[173,291],[183,304]].map(Object.freeze)) },

      5: { starboard: Object.freeze([[272,227],[263,240],[254,253],[245,266],[236,279],[226,292],[216,305]].map(Object.freeze)) },
      6: { starboard: Object.freeze([[280,220],[266,232],[251,244],[235,256],[218,269],[201,282],[183,294]].map(Object.freeze)) },
      7: { starboard: Object.freeze([[271,266],[246,272],[222,278],[198,283],[175,287],[152,290],[129,291]].map(Object.freeze)) },
      8: { starboard: Object.freeze([[286,278],[260,279],[234,280],[208,281],[182,281],[156,280],[130,278]].map(Object.freeze)) },
      9: { starboard: Object.freeze([[280,304],[257,296],[234,288],[211,280],[189,271],[168,262],[148,252]].map(Object.freeze)) },
      10:{ starboard: Object.freeze([[268,295],[248,283],[230,271],[213,260],[197,248],[182,236],[168,224]].map(Object.freeze)) },
      11:{ starboard: Object.freeze([[232,304],[221,291],[210,278],[199,265],[188,252],[177,239],[166,226]].map(Object.freeze)) },

      13:{ port: Object.freeze([[144,306],[157,295],[170,283],[184,271],[199,259],[214,248],[230,237]].map(Object.freeze)) },
      14:{ port: Object.freeze([[130,296],[151,289],[173,282],[196,274],[220,266],[245,258],[271,249]].map(Object.freeze)) },
      15:{ port: Object.freeze([[122,278],[147,274],[172,271],[197,268],[222,264],[247,260],[272,255]].map(Object.freeze)) },
    }),
  }),
});
