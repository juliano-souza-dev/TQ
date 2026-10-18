import { R2 } from './r2.js';

// Regions 5–12 reuse the proven island hitboxes, with different routes, oceans and pedagogy.
// An explicit exit stays outside the ports and never teleports the player automatically.
const presets=[
  [5,'Domínio do Eclipse',4096,5632,24,35,67,72,115],
  [6,'Estreito de Ferro',4096,5888,15,19,34,95,118],
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
  // R6 is open black water: remove decorative islands from both rendering and collision.
  // Mission and shipyard docks remain physically reachable, but nearly disappear in shadow.
  islands:Object.freeze(R2.islands
   .filter(island=>n!==6||island.kind!=='decoration')
   .map(island=>Object.freeze({...island,
    id:'r'+n+'-'+island.id,
    ...(n===6?{visualBrightness:.18,visualSaturation:.32}:{}),
    // Retain known collision-safe dock locations.
   }))),
  // After Eclipse, the Iron Strait is a deeper, colder night: no return to daylight.
  // R6 fog is drawn on a separate, lightweight layer; ships and objectives stay legible.
  ...(n===6?{atmosphere:Object.freeze({kind:'cold-night-mist',intensity:.78})}:{}),
  ocean:Object.freeze({...R2.ocean,night:n===5||n===6,tintR:r,tintG:g,tintB:b,swell,
   contrast,brightness:n===5?28:n===6?20:Math.round((r+g+b)/3),
   saturation:n===5?66:n===6?58:R2.ocean.saturation,
   sparkleIntensity:n===5?90:n===6?16:R2.ocean.sparkleIntensity,
   sparkleSharpness:n===6?36:R2.ocean.sparkleSharpness,
   speed:30+n*2,foamMix:n===6?23:30+n}),
 });
 return [region.id,region];
})));
export function fleetExitPoint(region){
 if(region.exitPoint)return region.exitPoint;
 const n=Number(region.id.slice(1));
 return {x:region.width-170,y:region.height-170,radius:155,toRegion:n+1};
}
