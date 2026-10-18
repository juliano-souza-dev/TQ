import { R2 } from './r2.js';

// Regions 5–12 reuse the proven island hitboxes, with different routes, oceans and pedagogy.
// An explicit exit stays outside the ports and never teleports the player automatically.
const presets=[
  [5,'Costa do Eclipse',4096,5632,110,92,132,108,61],
  [6,'Estreito de Ferro',4096,5888,91,103,118,105,67],
  [7,'Baía Rubra',4096,6144,125,75,85,72,78],
  [8,'Mar do Véu Negro',4096,5888,59,76,113,78,60],
  [9,'Arquipélago das Correntes',4096,6144,94,125,153,112,85],
  [10,'Mar das Nove Tabuadas',4096,6400,119,108,107,83,89],
  [11,'Abismo das Provas',4096,6400,49,64,88,108,95],
  [12,'Horizonte Supremo',4096,6656,124,125,145,107,99],
];
export const FUTURE_FLEET_REGIONS=Object.freeze(Object.fromEntries(presets.map(([n,name,width,height,r,g,b,swell,contrast])=>{
 const region=Object.freeze({
  ...R2,id:'r'+n,name,width,height,
  spawn:Object.freeze({x:400,y:850}),
  exitPoint:Object.freeze({x:width-170,y:height-170,radius:155,toRegion:n+1}),
  islands:Object.freeze(R2.islands.map(island=>Object.freeze({...island,
   id:'r'+n+'-'+island.id,
   // Retain known collision-safe dock locations.
  }))),
  ocean:Object.freeze({...R2.ocean,tintR:r,tintG:g,tintB:b,swell,
   contrast,brightness:Math.round((r+g+b)/3),speed:30+n*2,foamMix:30+n}),
 });
 return [region.id,region];
})));
export function fleetExitPoint(region){
 if(region.exitPoint)return region.exitPoint;
 const n=Number(region.id.slice(1));
 return {x:region.width-170,y:region.height-170,radius:155,toRegion:n+1};
}
