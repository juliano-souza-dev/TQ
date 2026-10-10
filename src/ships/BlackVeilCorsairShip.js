import { BLACK_MARKET_CORSAIR_MAPPING } from './BlackMarketCorsairMapping.js';

// Variante negra do mesmo casco do corsário do mercado negro.
export const BLACK_VEIL_CORSAIR_SHIP = Object.freeze({
  id: 'corsario-do-veu-negro',
  name: 'Corsário do Véu Negro',
  status: 'catalog-only',
  playable: false,
  npcEnabled: false,
  shopEnabled: false,
  rewardEnabled: false,
  cannonSlots: BLACK_MARKET_CORSAIR_MAPPING.cannonSlots,
  cannonLayout: Object.freeze({
    port: BLACK_MARKET_CORSAIR_MAPPING.cannonSlots,
    starboard: BLACK_MARKET_CORSAIR_MAPPING.cannonSlots,
    bow: 0,
    stern: 0,
  }),
  sprite: Object.freeze({
    path: '../../assets/ships/Corsario_do_Veu_Negro_1600x1600.webp',
    frameWidth: BLACK_MARKET_CORSAIR_MAPPING.frameWidth,
    frameHeight: BLACK_MARKET_CORSAIR_MAPPING.frameHeight,
    columns: BLACK_MARKET_CORSAIR_MAPPING.columns,
    rows: BLACK_MARKET_CORSAIR_MAPPING.rows,
    frameCount: BLACK_MARKET_CORSAIR_MAPPING.frameCount,
    angleStepDegrees: BLACK_MARKET_CORSAIR_MAPPING.angleStepDegrees,
    headingZero: BLACK_MARKET_CORSAIR_MAPPING.headingZero,
    clockwise: BLACK_MARKET_CORSAIR_MAPPING.clockwise,
    framesByHeading: BLACK_MARKET_CORSAIR_MAPPING.framesByHeading,
    cannonMuzzles: BLACK_MARKET_CORSAIR_MAPPING.cannonMuzzles,
  }),
});
