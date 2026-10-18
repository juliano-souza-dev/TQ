// Fixed payment for each NPC sinking; stable ammunition IDs are retained.
export function rollNpcAmmoLoot(regionId='r1',random=Math.random){if(regionId==='r4')return {id:'frozen-explosion',name:'Explosão Gélida',amount:100+Math.floor(Math.max(0,Math.min(.999999,random()))*151),gold:150};return {id:'rusted-iron',name:'Bola de Canhão de Ferro Enferrujado',amount:1,gold:150};}
export function grantNpcAmmoLoot(save,loot){
 if(!loot)return null;
 return {ammunition:{...(save?.ammunition??{}),[loot.id]:(Number(save?.ammunition?.[loot.id])||0)+loot.amount},
 profile:{...(save?.profile??{}),gold:(Number(save?.profile?.gold)||0)+(loot.gold||0)},
 consumables:{...(save?.consumables??{}),quantities:{...(save?.consumables?.quantities??{}),
  'flame-5x':(Number(save?.consumables?.quantities?.['flame-5x'])||0)+1}}};
}
