import { getShipFrame } from './ShipRegistry.js';

// Sprite-based cannon origins are optional. Null means "use the existing
// cannonHardpoint"; never infer a muzzle from a sail, bow or hidden gunport.
export function spriteCannonMuzzle(ship, player, target, headingDegrees, slot, frameWorldSize) {
  const sprite = ship?.sprite;
  if (!sprite?.cannonMuzzles || !Number.isInteger(slot) || slot < 0) return null;
  if (!Number.isFinite(headingDegrees) || !player || !target) return null;
  const width = Number(frameWorldSize?.width);
  const height = Number(frameWorldSize?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

  const theta = headingDegrees * Math.PI / 180;
  const rightX = Math.cos(theta), rightY = Math.sin(theta);
  const towardRight = (target.x - player.x) * rightX + (target.y - player.y) * rightY;
  const side = towardRight >= 0 ? 'starboard' : 'port';
  const frame = getShipFrame(headingDegrees, ship);
  const point = sprite.cannonMuzzles[frame]?.[side]?.[slot];
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  const sourceW = sprite.frameWidth, sourceH = sprite.frameHeight;
  if (!(sourceW > 0 && sourceH > 0)) return null;
  return {
    x: player.x + (point[0] / sourceW - .5) * width,
    y: player.y + (point[1] / sourceH - .5) * height,
  };
}
