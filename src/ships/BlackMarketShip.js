// Galeão neutro do Mercador do Mercado Negro.
// Mantém o id legado "mercado-negro" para não quebrar saves/NPCs existentes.
export const BLACK_MARKET_SHIP=Object.freeze({
  id:'mercado-negro',
  name:'Galeão Mercador da Caveira Rubra',
  description:'Galeão mercante fortemente ornamentado, de velas rubras e negras, usado pelo Mercador do Mercado Negro.',
  status:'npc-only',
  playable:false,
  npcEnabled:true,
  shopEnabled:false,
  rewardEnabled:false,
  cannonSlots:3,
  cannonLayout:Object.freeze({
    port:3,
    starboard:3,
    bow:0,
    stern:0,
  }),
  sprite:Object.freeze({
    path:'../../assets/ships/galeao_pirata_mercador.webp',
    // Fallback temporário evita quebrar o oceano caso o asset novo ainda não
    // tenha chegado ao branch servido pelo cliente.
    fallbackPath:'../../assets/ships/mercado-negro.png',
    frameWidth:400,
    frameHeight:400,
    columns:4,
    rows:4,
    frameCount:16,
    angleStepDegrees:22.5,
    headingZero:'north',
    clockwise:true,
    // Folha física: W, WNW, NW, NNW / N, NNE, NE, ENE /
    // E, ESE, SE, SSE / S, SSW, SW, WSW.
    framesByHeading:Object.freeze([4,5,6,7,8,9,10,11,12,13,14,15,0,1,2,3]),
    // Três bocas por bordo. Frames axiais 4 (N) e 12 (S) usam fallback
    // geométrico do sistema de combate, pois não há bordo lateral exposto.
    cannonMuzzles:Object.freeze({
      0:{port:Object.freeze([[165,280],[229,280],[293,277]].map(Object.freeze))},
      1:{port:Object.freeze([[155,263],[205,285],[258,306]].map(Object.freeze))},
      2:{port:Object.freeze([[142,243],[181,270],[225,302]].map(Object.freeze))},
      3:{port:Object.freeze([[138,232],[162,263],[188,299]].map(Object.freeze))},

      5:{starboard:Object.freeze([[262,233],[238,265],[212,298]].map(Object.freeze))},
      6:{starboard:Object.freeze([[273,243],[233,272],[190,302]].map(Object.freeze))},
      7:{starboard:Object.freeze([[282,264],[229,284],[176,302]].map(Object.freeze))},
      8:{starboard:Object.freeze([[293,277],[229,280],[165,280]].map(Object.freeze))},
      9:{starboard:Object.freeze([[258,306],[205,285],[155,263]].map(Object.freeze))},
      10:{starboard:Object.freeze([[225,302],[181,270],[142,243]].map(Object.freeze))},
      11:{starboard:Object.freeze([[188,299],[162,263],[138,232]].map(Object.freeze))},

      13:{port:Object.freeze([[212,298],[238,265],[262,233]].map(Object.freeze))},
      14:{port:Object.freeze([[190,302],[233,272],[273,243]].map(Object.freeze))},
      15:{port:Object.freeze([[176,302],[229,284],[282,264]].map(Object.freeze))},
    }),
  }),
});
