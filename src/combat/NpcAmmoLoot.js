import { AMMUNITION, EVENTS, isItemVisible } from '../items/EquipmentCatalog.js';

// Every hostile NPC sinking grants one randomly selected ammunition stack.
// Mission-specific drops remain separate, and inventory is stored by stable ammo ID.
export function rollNpcAmmoLoot(random=Math.random) {
  const pool=AMMUNITION.filter(item=>isItemVisible(item,EVENTS));
  if(!pool.length)return null;
  const draw=()=>Math.min(.999999,Math.max(0,Number(random())||0));
  const item=pool[Math.floor(draw()*pool.length)];
  const amount=25+Math.floor(draw()*76); // 25-100 rounds
  return {id:item.id,name:item.name,amount};
}

export function grantNpcAmmoLoot(save,loot){
  if(!loot)return null;
  const stock=Math.max(0,Math.floor(Number(save?.ammunition?.[loot.id])||0));
  return {ammunition:{...(save?.ammunition??{}),[loot.id]:stock+loot.amount}};
}
