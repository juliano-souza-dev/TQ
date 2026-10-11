// Fixed payment for each NPC sinking; stable ammunition IDs are retained.
export function rollNpcAmmoLoot(){return {id:'rusted-iron',name:'Bola de Canhão de Ferro Enferrujado',amount:1,gold:150};}
export function grantNpcAmmoLoot(save,loot){
 if(!loot)return null;
 return {ammunition:{...(save?.ammunition??{}),[loot.id]:(Number(save?.ammunition?.[loot.id])||0)+loot.amount},
 profile:{...(save?.profile??{}),gold:(Number(save?.profile?.gold)||0)+(loot.gold||0)}};
}
