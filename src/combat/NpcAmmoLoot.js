import {MOON_BARRAGE_AMMO_ID,R5_LUNAR_ENEMY_MIN,R5_LUNAR_ENEMY_MAX,lunarRandomAmount} from '../missions/RegionFiveEclipse.js';
// Fixed payment for each NPC sinking; stable ammunition IDs are retained.
export function rollNpcAmmoLoot(regionId='r1',random=Math.random){
 const roll=()=>Math.max(0,Math.min(.999999,Number(random())||0));
 const doubleDamage=200+Math.floor(roll()*301);
 if(regionId==='r5')return {id:MOON_BARRAGE_AMMO_ID,name:'Rajada da Lua',
  amount:lunarRandomAmount(R5_LUNAR_ENEMY_MIN,R5_LUNAR_ENEMY_MAX,random),gold:150,doubleDamage};
 if(regionId==='r4')return {id:'frozen-explosion',name:'Explosão Gélida',
  amount:100+Math.floor(roll()*151),gold:150,doubleDamage};
 return {id:'rusted-iron',name:'Bola de Canhão de Ferro Enferrujado',
  amount:1,gold:150,doubleDamage};
}
export function grantNpcAmmoLoot(save,loot){
 if(!loot)return null;
 return {ammunition:{...(save?.ammunition??{}),[loot.id]:(Number(save?.ammunition?.[loot.id])||0)+loot.amount},
 profile:{...(save?.profile??{}),gold:(Number(save?.profile?.gold)||0)+(loot.gold||0)},
 consumables:{...(save?.consumables??{}),quantities:{...(save?.consumables?.quantities??{}),
  'flame-5x':(Number(save?.consumables?.quantities?.['flame-5x'])||0)+1,
  'double-damage':(Number(save?.consumables?.quantities?.['double-damage'])||0)+
   Math.max(0,Math.floor(Number(loot.doubleDamage)||0))}}};
}
