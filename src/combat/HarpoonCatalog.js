// Armas anti-monstros: apenas um lançador equipado por jogador.
// Novos modelos podem ser adicionados sem alterar a lógica de combate.
export const HARPOON_LAUNCHERS=Object.freeze([
  Object.freeze({
    id:'naval-harpoon-starter', name:'Arpoeiro do Marujo',
    asset:new URL('../../assets/cannonball/lancador_arpoes_naval.webp',import.meta.url).href,
    projectileAsset:new URL('../../assets/cannons/arpao_naval_simples.webp',import.meta.url).href,
    reloadSeconds:7, range:620, damageMultiplier:0, baseDamage:30,
    projectileSpeed:650, accuracy:.95,
  }),
]);
export const STARTER_HARPOON=HARPOON_LAUNCHERS[0];
export const STARTER_HARPOON_AMMO=500;
export const HARPOON_AMMO_ID='harpoon-mariner';
export const ARMOR_PIERCING_HARPOON_ID='harpoon-armor-piercing';
export const ARMOR_PIERCING_HARPOON_DAMAGE=60;
export const armorPiercingHarpoonStock=save=>Math.max(0,Math.floor(Number(save?.harpoonAmmo?.[ARMOR_PIERCING_HARPOON_ID])||0));
export const harpoonStock=save=>Math.max(0,Math.floor(Number(save?.harpoonAmmo?.[HARPOON_AMMO_ID])||0));

export const equippedHarpoon=save=>{
  const id=save?.equipment?.equippedHarpoonId;
  const owned=save?.equipment?.ownedHarpoonIds??[];
  return HARPOON_LAUNCHERS.find(h=>h.id===id && (h.id===STARTER_HARPOON.id||owned.includes(h.id)))??STARTER_HARPOON;
};
export const harpoonDamage=launcher=>Math.max(1,Math.round(launcher.baseDamage*(1+launcher.damageMultiplier)));
