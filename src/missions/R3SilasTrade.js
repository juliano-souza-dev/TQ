import { HORIZON_HARPOON_ID } from '../combat/HarpoonCatalog.js';

// Existing catalog items. Special cannons use the matching guided ammunition.
export const R3_SILAS_MISSION_ID='r3-silas-pact';
export const R3_SILAS_REWARD=Object.freeze({
  cannons:Object.freeze({'aetherion-mk1':2,'pumpkin-terror':18}),
  ammunition:Object.freeze({'aetherion-seeker':2500,'volcanic-lava':2000,'terror-rose':250}),
  harpoonLaunchers:Object.freeze([HORIZON_HARPOON_ID]),
  harpoonAmmo:Object.freeze({'harpoon-mariner':1000}),
});

const copyNumbers=stock=>Object.fromEntries(Object.entries(stock??{})
  .map(([key,value])=>[key,Math.max(0,Math.floor(Number(value)||0))]));

export function exchangeR3SilasCargo(save={}){
  const campaign=save.r3Campaign??{};
  if(campaign.active!==R3_SILAS_MISSION_ID
    ||!campaign.claimed?.includes('r3-dark-waters-warning')
    ||campaign.silasTradeCompleted||campaign.claimed?.includes(R3_SILAS_MISSION_ID))return null;
  const equipment=save.equipment??{};
  // Inventory and equipped cannons are transferred together. Silas's holdings
  // are retained in the save, so they are not merely silently deleted.
  const receivedBySilas={
    cannonCounts:copyNumbers(equipment.cannonCounts),
    ownedCannonIds:[...(equipment.ownedCannonIds??[])],
    loadout:Object.fromEntries(Object.entries(equipment.loadout??{})
      .map(([ship,slots])=>[ship,Array.isArray(slots)?[...slots]:[]])),
    ownedHarpoonIds:[...(equipment.ownedHarpoonIds??[])],
    equippedHarpoonId:equipment.equippedHarpoonId??null,
    ammunition:copyNumbers(save.ammunition),
    harpoonAmmo:copyNumbers(save.harpoonAmmo),
    consumables:copyNumbers(save.consumables?.quantities),
  };
  const emptyLoadouts=Object.fromEntries(Object.keys(equipment.loadout??{})
    .map(ship=>[ship,[]]));
  const consumedEffects=[
    'activeUntil','shieldActiveUntil','speedActiveUntil','treasureMapActiveUntil'
  ];
  const consumables={...(save.consumables??{}),quantities:{}};
  for(const key of consumedEffects)consumables[key]=0;
  return {
    r3Campaign:{...campaign,silasTradeCompleted:true,silasHoldings:receivedBySilas},
    equipment:{
      ...equipment,
      // Starter gear was also traded and must not respawn through save repair.
      starterCannonTransferredToSilas:true,
      cannonCounts:{...R3_SILAS_REWARD.cannons},
      ownedCannonIds:Object.keys(R3_SILAS_REWARD.cannons),
      loadout:emptyLoadouts,
      ownedHarpoonIds:[HORIZON_HARPOON_ID],
      equippedHarpoonId:HORIZON_HARPOON_ID,
    },
    ammunition:{...R3_SILAS_REWARD.ammunition},
    harpoonAmmo:{...R3_SILAS_REWARD.harpoonAmmo},
    consumables,
  };
}
