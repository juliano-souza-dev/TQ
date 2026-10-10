import { R2 } from './r2.js';
// Initial navigable region unlocked through the Dark Waters passage.
export const R3=Object.freeze({
  id:'r3',name:'Águas Escuras',width:4096,height:5120,
  spawn:Object.freeze({x:420,y:860}),
  blackMarketMerchant:Object.freeze({
    id:'r3-mercador-do-breu',name:'Silas Rubro, o Mercador do Breu',
    x:2050,y:2700,heading:90,interactionRadius:180,
  }),
  terrorBoss:Object.freeze({
    id:'r3-terror-do-mar',name:'Terror do Mar · Capitão Varkor Tenebris',
    x:3220,y:3450,heading:205,
  }),
  terrorRaiders:Object.freeze([
    Object.freeze({
      id:'r3-sombra-do-saque',name:'Sombra do Saque',
      x:520,y:3260,heading:90,speed:520,maxHealth:650,
      detectionRange:650,raidRadius:86,
    }),
    Object.freeze({
      id:'r3-dente-do-pavor',name:'Dente do Pavor',
      x:3570,y:3260,heading:270,speed:565,maxHealth:750,
      detectionRange:680,raidRadius:86,
    }),
  ]),
  islands:Object.freeze([
    Object.freeze({...R2.islands.find(i=>i.kind==='missions'),id:'r3-missions',x:850,y:1700}),
    Object.freeze({...R2.islands.find(i=>i.kind==='shipyard'),id:'r3-shipyard',x:3370,y:1650}),
    Object.freeze({...R2.islands.find(i=>i.id==='r2-scenery-south'),id:'r3-dark-island',x:2350,y:4200}),
  ]),
  ocean:Object.freeze({
    ...R2.ocean,
    // Mar do Terror: base petróleo/verde-abissal, mais escuro que R1 e R2.
    brightness:58,saturation:88,contrast:124,
    tintR:58,tintG:118,tintB:78,
    speed:31,swell:72,distortion:56,
    waveMix:49,foamMix:18,sparkleIntensity:5,sparkleSharpness:38,
    corruption:Object.freeze({
      active:true,
      colorR:24,colorG:151,colorB:77,
      glow:58,noise:62,pulse:24,
      zones:Object.freeze([
        // Núcleo do Terror: área do chefe, a contaminação mais intensa.
        Object.freeze({x:3220,y:3450,radius:1450,intensity:1}),
        // Corredor central: liga o mapa ao território dominado.
        Object.freeze({x:2140,y:2860,radius:1250,intensity:.72}),
        // Rota do Sombra do Saque.
        Object.freeze({x:620,y:3260,radius:820,intensity:.68}),
        // Entrada norte: eco visual do spoiler verde visto na R1.
        Object.freeze({x:1220,y:1260,radius:900,intensity:.48}),
      ]),
    }),
  }),
});