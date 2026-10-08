// Event-only visual settings. The normal ocean shader and its texture remain untouched.
import { EVENTS } from '../items/EquipmentCatalog.js';

export const HALLOWEEN_ATMOSPHERE = Object.freeze({
  desktopIntensity: 0.96,
  mobileIntensity: 0.72,
  desktopResolutionScale: 0.72,
  mobileResolutionScale: 0.48,
  desktopFrameIntervalMs: 33,
  mobileFrameIntervalMs: 50,
});

export function isHalloweenAtmosphereActive(events = EVENTS) {
  return events?.halloween === true;
}

export function halloweenFogOptions(viewportWidth, reducedMotion = false) {
  const mobile = Number(viewportWidth) < 768;
  return {
    intensity: mobile
      ? HALLOWEEN_ATMOSPHERE.mobileIntensity
      : HALLOWEEN_ATMOSPHERE.desktopIntensity,
    resolutionScale: reducedMotion
      ? 0.42
      : mobile
        ? HALLOWEEN_ATMOSPHERE.mobileResolutionScale
        : HALLOWEEN_ATMOSPHERE.desktopResolutionScale,
    frameIntervalMs: reducedMotion
      ? 100
      : mobile
        ? HALLOWEEN_ATMOSPHERE.mobileFrameIntervalMs
        : HALLOWEEN_ATMOSPHERE.desktopFrameIntervalMs,
    animate: !reducedMotion,
  };
}
