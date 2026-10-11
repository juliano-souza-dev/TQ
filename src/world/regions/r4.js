import { R2 } from './r2.js';

// Terras Gélidas has its own shipyard appearance without changing other regions.
const frozenShipyardAsset = new URL('../../../assets/regions/islands/ilha_estaleiro_gelada_transparente.png', import.meta.url).href;
const frozenMissionAsset = new URL('../../../assets/regions/islands/Porto Ártico Congelado Fantástico.png', import.meta.url).href;
export const R4 = Object.freeze({
  ...R2,
  id:'r4',
  name:'Terras Gélidas',
  islands:Object.freeze(R2.islands.map(island=>island.kind==='shipyard'
    ? Object.freeze({...island,asset:frozenShipyardAsset})
    : island.kind==='missions' ? Object.freeze({...island,asset:frozenMissionAsset}) : island)),
  ocean:Object.freeze({...R2.ocean,brightness:122,saturation:64,tintR:87,tintG:127,tintB:153,speed:20,swell:18,foamMix:48}),
});
