// NPC exclusivo da Costa dos Corsários. Não é vendável, equipável ou concedido ao jogador.
export const TERROR_DO_MAR_SHIP = Object.freeze({
  id: 'terror-do-mar',
  name: 'Terror do Mar',
  status: 'npc-only',
  plannedRegion: 'r3',
  playable: false,
  npcEnabled: true,
  shopEnabled: false,
  rewardEnabled: false,
  maxHealth: 500000,
  cannonSlots: 10,
  cannonLayout: Object.freeze({
    port: 10,
    starboard: 10,
    bow: 0,
    stern: 0,
  }),
  // O sprite mostra seis portinholas por bordo. Os dez slots de equipamento
  // são distribuídos ao longo dessa bateria para que nenhum slot volte ao
  // hardpoint genérico durante uma salva.
  visualGunports: Object.freeze({ port: 6, starboard: 6 }),
  damage: 0,
  range: 0,
  speed: Object.freeze({ min: 45, initial: 70, max: 95 }),
  acceleration: 120,
  ai: Object.freeze({
    behavior: 'patrol',
    attackPlayer: false,
  }),
  sprite: Object.freeze({
    path: '../../assets/ships/terror do mar.webp',
    frameWidth: 400,
    frameHeight: 400,
    columns: 4,
    rows: 4,
    frameCount: 16,
    angleStepDegrees: 22.5,
    // Atlas 4x4 mapeado no sentido horário.
    // Folha física: W, WNW, NW, NNW / N, NNE, NE, ENE /
    // E, ESE, SE, SSE / S, SSW, SW, WSW.
    // API do jogo: N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW.
    framesByHeading: Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),

    // Coordenadas [x,y] no quadro 400x400.
    // Frames 4 (N, popa) e 12 (S, proa) ficam no fallback geométrico:
    // nessas vistas a lateral não oferece uma boca verificável sem inventar
    // disparo sobre vela, amurada ou ornamento.
    cannonMuzzles: Object.freeze({
      0: { port: Object.freeze([[165,292],[181,293],[197,295],[214,296],[231,297],[248,297],[265,297],[283,296],[301,293],[319,290]].map(Object.freeze)) },
      1: { port: Object.freeze([[150,283],[166,286],[182,291],[198,295],[214,299],[230,303],[246,307],[262,312],[279,316],[295,321]].map(Object.freeze)) },
      2: { port: Object.freeze([[116,228],[122,239],[129,250],[137,261],[146,271],[156,281],[168,290],[181,301],[194,311],[207,320]].map(Object.freeze)) },
      3: { port: Object.freeze([[126,233],[131,244],[137,255],[143,266],[149,277],[155,287],[162,297],[170,307],[178,315],[186,322]].map(Object.freeze)) },

      5: { starboard: Object.freeze([[279,232],[274,243],[267,254],[260,265],[252,276],[244,287],[235,297],[225,308],[215,318],[205,326]].map(Object.freeze)) },
      6: { starboard: Object.freeze([[285,216],[278,229],[270,242],[261,255],[251,269],[240,282],[226,296],[208,309],[187,319],[166,327]].map(Object.freeze)) },
      7: { starboard: Object.freeze([[249,280],[233,286],[217,292],[201,299],[185,305],[169,312],[153,318],[137,323],[121,328],[106,331]].map(Object.freeze)) },
      8: { starboard: Object.freeze([[84,293],[100,296],[117,298],[134,300],[151,300],[168,300],[185,299],[201,297],[217,295],[233,292]].map(Object.freeze)) },
      9: { starboard: Object.freeze([[207,321],[191,316],[175,310],[159,304],[144,298],[129,291],[114,283],[99,274],[85,265],[73,256]].map(Object.freeze)) },
      10:{ starboard: Object.freeze([[205,320],[191,314],[177,308],[163,301],[149,294],[135,286],[121,278],[107,269],[92,260],[78,251]].map(Object.freeze)) },
      11:{ starboard: Object.freeze([[188,315],[181,306],[173,297],[166,287],[158,277],[150,266],[142,255],[134,244],[126,232],[119,220]].map(Object.freeze)) },

      13:{ port: Object.freeze([[291,250],[282,260],[273,271],[263,282],[252,293],[241,303],[229,312],[217,319],[204,324],[191,327]].map(Object.freeze)) },
      14:{ port: Object.freeze([[296,253],[287,263],[278,274],[268,284],[257,294],[245,304],[232,313],[218,320],[203,325],[188,328]].map(Object.freeze)) },
      15:{ port: Object.freeze([[326,274],[311,280],[297,286],[282,292],[267,298],[251,303],[235,309],[220,314],[204,318],[189,321]].map(Object.freeze)) },
    }),
  }),
});
