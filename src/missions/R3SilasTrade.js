import { HORIZON_HARPOON_ID } from '../combat/HarpoonCatalog.js';
import { SHIP_CATALOG, STARTER_SHIP } from '../ships/ShipRegistry.js';

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

// Only the currently equipped ship receives cannons. Remaining stock stays owned.
// Never exceed available inventory quantities or the ship's actual slot capacity.
export function silasReceivedLoadout(save={}){
  const eq=save.equipment??{};
  const shipId=eq.equippedShipId;
  if(!shipId)return [];
  const ship=[STARTER_SHIP,...SHIP_CATALOG].find(s=>s.id===shipId);
  const baseCapacity=Number(ship?.cannonSlots)||Math.max(7,(eq.loadout?.[shipId]??[]).length);
  const upgrade=save.shipUpgrades?.masterShipwright?(shipId==='fragata-sombra-cacadora'?1:5):0;
  const capacity=Math.max(0,baseCapacity+upgrade);
  const counts=R3_SILAS_REWARD.cannons;
  const order=['aetherion-mk1','pumpkin-terror'];
  const slots=[];
  for(const id of order){
    for(let i=0;i<counts[id] && slots.length<capacity;i++)slots.push(id);
  }
  return slots;
}

// One-time repair for saves from before Silas was able to equip guns at trade time.
// Never override a player's manually configured battery.
export function reconcileSilasAutomaticLoadout(save={}){
  const c=save.r3Campaign??{}, eq=save.equipment??{}, shipId=eq.equippedShipId;
  if(!c.silasTradeCompleted||c.silasLoadoutReconciled||!shipId)return null;
  const currentlyEquipped=eq.loadout?.[shipId]??[];
  const hasReceivedCannons=(Number(eq.cannonCounts?.['aetherion-mk1'])||0)>=2
    && (Number(eq.cannonCounts?.['pumpkin-terror'])||0)>=18;
  const shouldEquip=!currentlyEquipped.some(Boolean)&&hasReceivedCannons;
  return {r3Campaign:{...c,silasLoadoutReconciled:true},
    ...(shouldEquip?{equipment:{...eq,loadout:{...(eq.loadout??{}),
      [shipId]:silasReceivedLoadout(save)}}}:{})};
}

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
  const currentShip=equipment.equippedShipId;
  if(currentShip)emptyLoadouts[currentShip]=silasReceivedLoadout(save);
  const consumedEffects=[
    'activeUntil','shieldActiveUntil','speedActiveUntil','treasureMapActiveUntil'
  ];
  const consumables={...(save.consumables??{}),quantities:{}};
  for(const key of consumedEffects)consumables[key]=0;
  return {
    r3Campaign:{...campaign,silasTradeCompleted:true,silasLoadoutReconciled:true,
      silasHoldings:receivedBySilas},
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
