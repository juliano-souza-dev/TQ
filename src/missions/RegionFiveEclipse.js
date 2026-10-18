// Region 5 mechanics are isolated from the previous campaigns.
export const R5_ECLIPSE_BOSS_ID='r5-eclipse';
export const R5_LEVIATHAN_ID='r5-leviathan';
export const MOON_BARRAGE_AMMO_ID='moon-barrage';
export const R5_LUNAR_ENEMY_MIN=700;
export const R5_LUNAR_ENEMY_MAX=1000;
export const R5_LUNAR_TREASURE_MIN=100;
export const R5_LUNAR_TREASURE_MAX=1500;
export const lunarRandomAmount=(min,max,random=Math.random)=>{
 const roll=Math.max(0,Math.min(.999999,Number(random())||0));
 return min+Math.floor(roll*(max-min+1));
};
export const isLunarResupply=id=>/^fleet-r5-moon-resupply-\d+$/.test(String(id));
