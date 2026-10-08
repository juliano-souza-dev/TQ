export function getShipSpeed(ship, bonuses = []) {
  const min = ship.speed.min;
  const max = ship.speed.max;
  const base = ship.speed.initial;
  const bonus = bonuses.reduce((sum, item) => sum + (item?.speedBonus ?? 0), 0);
  return Math.max(min, Math.min(max, base + bonus));
}
