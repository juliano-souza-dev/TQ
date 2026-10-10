import { BLACK_MARKET_CORSAIR_MAPPING } from './BlackMarketCorsairMapping.js';

// Variante cromática do corsário do mercado negro.
// O atlas e as origens de disparo são compartilhados com as demais variantes do mesmo casco.
export const BLOOD_RED_CORSAIR_SHIP = Object.freeze({
  id: 'corsario-vermelho-sangue',
  name: 'Corsário Vermelho Sangue',
  status: 'npc-only',
  playable: false,
  npcEnabled: true,
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
    path: '../../assets/ships/corsário-vermelho-sangue.webp',
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
