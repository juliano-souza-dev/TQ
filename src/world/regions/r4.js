import { R2 } from './r2.js';

// Terras Gélidas has its own shipyard appearance without changing other regions.
const frozenShipyardAsset = new URL('../../../assets/regions/islands/ilha_estaleiro_gelada_transparente.png', import.meta.url).href;
const frozenMissionAsset = new URL('../../../assets/regions/islands/Porto Ártico Congelado Fantástico.png', import.meta.url).href;
// High-quality transparent WebP converted from "Ilha Invernal de Gelo e Neve.png".
// Only R4 replaces the original Forgotten Island illustration.
const winterForgottenAsset = new URL('../../../assets/regions/islands/ilha_invernal_gelo_neve.webp', import.meta.url).href;
const oldForgottenAsset = R2.islands.find(island=>island.id==='r2-scenery-north').asset;
export const R4 = Object.freeze({
  ...R2,
  id:'r4',
  name:'Terras Gélidas',
  // 25% more total navigable area than R2, without resizing the old coast.
  width:R2.width,
  height:Math.round(R2.height*1.25),
  islands:Object.freeze([
    ...R2.islands.map(island=>island.kind==='shipyard'
      ? Object.freeze({...island,asset:frozenShipyardAsset})
      : island.kind==='missions' ? Object.freeze({...island,asset:frozenMissionAsset})
      : island.id==='r2-scenery-north' ? Object.freeze({
        ...island,name:'Ilha Esquecida Invernal',
        asset:winterForgottenAsset,fallbackAsset:oldForgottenAsset,
      })
      : island),
    // A second Forgotten Island occupies the newly navigable southern sea.
    Object.freeze({
      id:'r4-forgotten-south',name:'Segunda Ilha Esquecida',
      kind:'decoration',x:2050,y:5650,
      size:1080,width:900,height:740,
      asset:winterForgottenAsset,fallbackAsset:oldForgottenAsset,
    }),
  ]),
  ocean:Object.freeze({...R2.ocean,brightness:122,saturation:64,tintR:87,tintG:127,tintB:153,speed:20,swell:18,foamMix:48}),
});
