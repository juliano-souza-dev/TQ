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
  cannonSlots: 1,
  speed: Object.freeze({
    min: FUGITIVE_FRIGATE_SHIP.speed.min * 1.05,
    initial: FUGITIVE_FRIGATE_SHIP.speed.initial * 1.05,
    max: FUGITIVE_FRIGATE_SHIP.speed.max * 1.05,
  }),
  acceleration: FUGITIVE_FRIGATE_SHIP.acceleration,
  sprite: FUGITIVE_FRIGATE_SHIP.sprite,
});
