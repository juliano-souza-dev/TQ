import { EVENTS } from '../items/EquipmentCatalog.js';
export const SEA_GLINTS = Object.freeze([
  {id:'halloween-glint-1',x:3200,y:3250},
  {id:'halloween-glint-2',x:2800,y:2700},
  {id:'halloween-glint-3',x:1750,y:2500},
  {id:'halloween-glint-4',x:1100,y:2950},
  {id:'halloween-glint-5',x:2200,y:3450},
]);
const roll=(min,max,random)=>min+Math.floor(random()*(max-min+1));
export function collectSeaGlint(save,id,random=Math.random) {
  if(!EVENTS.halloween || !SEA_GLINTS.some(g=>g.id===id))return null;
  if((save.collectedGlints??[]).includes(id))return null;
  const simple=roll(100,250,random),special=roll(10,250,random),gold=roll(1,100,random);
  return {rewards:{simple,special,gold},patch:{
    collectedGlints:[...(save.collectedGlints??[]),id],
    ammunition:{...save.ammunition,'rusted-iron':(save.ammunition?.['rusted-iron']??20)+simple,
      'halloween-purple-ball':(save.ammunition?.['halloween-purple-ball']??0)+special},
    profile:{...save.profile,gold:(save.profile?.gold??0)+gold},
  }};
}
