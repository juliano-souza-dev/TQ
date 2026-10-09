// Navio de Halloween registrado somente no catálogo.
// Não inserir em mapa, frota do jogador, loja ou recompensas sem regra específica.
export const PUMPKIN_FLEET_GALLEON_SHIP = Object.freeze({
  id: 'galeao-frota-das-aboboras',
  name: 'Galeão da Frota das Abóboras',
  description: 'Galeão de Halloween com velas roxas e laranjas e portinholas decoradas com abóboras.',
  status: 'story-reward',
  cannonSlots: 8,
  cannonLayout: Object.freeze({
    port: 4,
    starboard: 4,
    bow: 0,
    stern: 0,
  }),
  // O desenho mostra três bocas/culatras claramente verificáveis em cada
  // bordo nas vistas de proa/popa. Os oito slots lógicos são distribuídos
  // ao longo da mesma bateria para nenhum slot cair no hardpoint genérico.
  visualGunports: Object.freeze({ port: 3, starboard: 3 }),
  speed: Object.freeze({ min: 360, initial: 480, max: 600 }),
  playable: true,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: true,
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

    // Coordenadas [x,y] no quadro 400x400. Nos quadros 0 e 8 as duas
    // baterias laterais ficam legíveis, então ambos os bordos são mapeados.
    cannonMuzzles: Object.freeze({
      0: {
        port: Object.freeze([[102,188],[102,196],[102,204],[102,212],[102,220],[102,228],[102,236],[102,244]].map(Object.freeze)),
        starboard: Object.freeze([[285,188],[286,196],[286,204],[287,212],[287,220],[287,228],[288,236],[288,244]].map(Object.freeze)),
      },
      1: { starboard: Object.freeze([[324,188],[323,199],[321,210],[318,221],[315,232],[311,243],[306,254],[299,265]].map(Object.freeze)) },
      2: { starboard: Object.freeze([[329,187],[328,198],[326,209],[323,220],[319,231],[315,242],[309,253],[301,264]].map(Object.freeze)) },
      3: { starboard: Object.freeze([[245,309],[226,315],[207,320],[188,323],[169,326],[150,326],[131,323],[112,318]].map(Object.freeze)) },
      4: { starboard: Object.freeze([[246,311],[225,318],[204,323],[183,326],[162,327],[141,325],[120,321],[101,315]].map(Object.freeze)) },
      5: { starboard: Object.freeze([[220,317],[200,314],[180,309],[160,302],[141,294],[123,285],[107,275],[94,264]].map(Object.freeze)) },
      6: { starboard: Object.freeze([[225,317],[205,313],[185,307],[165,299],[146,290],[129,279],[114,267],[102,253]].map(Object.freeze)) },
      7: { starboard: Object.freeze([[288,186],[290,198],[292,210],[293,222],[292,234],[290,246],[286,258],[280,270]].map(Object.freeze)) },
      8: {
        port: Object.freeze([[111,188],[109,197],[107,206],[106,215],[106,224],[107,234],[109,244],[112,254]].map(Object.freeze)),
        starboard: Object.freeze([[287,188],[289,197],[291,206],[292,215],[292,224],[291,234],[289,244],[286,254]].map(Object.freeze)),
      },
      9: { port: Object.freeze([[112,188],[108,200],[104,212],[101,224],[101,236],[104,248],[109,260],[116,272]].map(Object.freeze)) },
      10:{ port: Object.freeze([[300,244],[287,255],[273,267],[258,279],[242,290],[225,299],[207,307],[188,312]].map(Object.freeze)) },
      11:{ port: Object.freeze([[314,268],[295,279],[276,289],[257,298],[237,306],[217,312],[197,316],[177,317]].map(Object.freeze)) },
      12:{ port: Object.freeze([[300,286],[279,296],[257,304],[235,310],[213,314],[191,315],[169,313],[148,308]].map(Object.freeze)) },
      13:{ port: Object.freeze([[289,302],[269,310],[248,316],[227,320],[206,322],[185,321],[165,316],[146,309]].map(Object.freeze)) },
      14:{ port: Object.freeze([[266,313],[247,311],[228,307],[209,301],[191,294],[173,286],[157,276],[142,265]].map(Object.freeze)) },
      15:{ port: Object.freeze([[242,312],[226,305],[211,297],[196,288],[181,278],[167,267],[154,255],[143,242]].map(Object.freeze)) },
    }),
  }),
});
