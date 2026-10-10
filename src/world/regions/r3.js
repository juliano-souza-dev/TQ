import { R2 } from './r2.js';
// Initial navigable region unlocked through the Dark Waters passage.
export const R3=Object.freeze({
  id:'r3',name:'Águas Escuras',width:4096,height:5120,
  spawn:Object.freeze({x:420,y:860}),
  blackMarketMerchant:Object.freeze({
    id:'r3-mercador-do-breu',name:'Silas Rubro, o Mercador do Breu',
    x:2050,y:2700,heading:90,interactionRadius:180,
  }),
  islands:Object.freeze([
    Object.freeze({...R2.islands.find(i=>i.kind==='missions'),id:'r3-missions',x:850,y:1700}),
    Object.freeze({...R2.islands.find(i=>i.kind==='shipyard'),id:'r3-shipyard',x:3370,y:1650}),
    Object.freeze({...R2.islands.find(i=>i.id==='r2-scenery-south'),id:'r3-dark-island',x:2350,y:4200}),
  ]),
  ocean:Object.freeze({...R2.ocean,brightness:37,saturation:54,contrast:112,
    tintR:33,tintG:42,tintB:95,speed:46,swell:64,foamMix:24,sparkleIntensity:8}),
});