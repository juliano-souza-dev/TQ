import { FUGITIVE_FRIGATE_SHIP } from './FugitiveFrigateShip.js';

// A réplica conquistável tem o mesmo casco, sprites e desempenho de fuga.
export const SHADOW_CHASER_SHIP = Object.freeze({
  id: 'fragata-sombra-cacadora',
  name: 'Fragata Caçadora das Sombras',
  playable: true,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: true,
  maxHealth: FUGITIVE_FRIGATE_SHIP.maxHealth,
  cannonSlots: 3,
  speed: FUGITIVE_FRIGATE_SHIP.speed,
  acceleration: FUGITIVE_FRIGATE_SHIP.acceleration,
  sprite: FUGITIVE_FRIGATE_SHIP.sprite,
});
