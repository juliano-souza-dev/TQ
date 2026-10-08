export const ROSE_GOLD_SHIP = Object.freeze({
  id: 'galeao-rosas-de-ouro',
  name: 'Galeão Rosas de Ouro',
  maxHealth: 120,
  cannonSlots: 5,
  speed: Object.freeze({ min: 80, initial: 100, max: 160 }),
  sprite: Object.freeze({
    path: '../../assets/ships/galeao-rosas-de-ouro.webp',
    frameWidth: 400, frameHeight: 400, columns: 4, rows: 4,
    angleStepDegrees: 22.5,
    // Índices do atlas 4x4: 4=N, 8=L, 12=S, 0=O. Progressão horária de 22,5°.
    framesByHeading: [4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3],

    // Coordenadas [x,y] da boca de cinco canhões no QUADRO 400x400.
    // Ordem: proa -> popa, cada lado independentemente.
    // O lado encoberto, e as vistas diretamente pela proa/popa (4 e 12),
    // não têm marcação verificável: nesses casos vale o hardpoint legado.
    cannonMuzzles: Object.freeze({
      0: { port: [[184,315],[215,318],[243,317],[267,315],[293,312]] },
      1: { port: [[131,260],[161,277],[192,291],[226,306],[268,313]] },
      2: { port: [[129,234],[145,253],[163,269],[185,287],[207,304]] },
      3: { port: [[127,255],[144,273],[159,285],[175,302],[187,311]] },
      5: { starboard: [[294,213],[285,242],[263,263],[247,279],[230,293]] },
      6: { starboard: [[292,258],[257,283],[235,298],[188,311],[162,322]] },
      7: { starboard: [[286,279],[269,292],[251,304],[214,310],[177,315]] },
      8: { starboard: [[258,309],[228,313],[199,314],[170,314],[112,308]] },
      9: { starboard: [[221,310],[184,306],[156,300],[115,285],[87,269]] },
      10: { starboard: [[208,320],[182,316],[155,307],[129,297],[88,281]] },
      11: { starboard: [[177,316],[160,303],[144,292],[129,282],[110,242]] },
      13: { port: [[221,322],[243,315],[258,302],[273,287],[292,260]] },
      14: { port: [[199,326],[227,325],[254,320],[277,312],[316,297]] },
      15: { port: [[198,328],[225,327],[250,322],[274,318],[296,306]] },
    }),
  }),
});
