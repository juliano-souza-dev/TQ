// Rectangular island footprints, expanded by the ship's collision radius.
export const SHIP_COLLISION_RADIUS = 28;

export function collidesWithIsland(region, x, y, radius = SHIP_COLLISION_RADIUS) {
  return (region.islands ?? []).some(island => {
    const halfW = (island.width ?? island.size * 0.65) / 2 + radius;
    const halfH = (island.height ?? island.size * 0.5) / 2 + radius;
    return x >= island.x - halfW && x <= island.x + halfW &&
      y >= island.y - halfH && y <= island.y + halfH;
  });
}

export function resolveIslandMovement(region, fromX, fromY, toX, toY, radius = SHIP_COLLISION_RADIUS) {
  // Axis-separated swept movement prevents tunneling and allows sliding along shores.
  const moveAxis = (x, y, target, axis) => {
    const distance = target - (axis === 'x' ? x : y);
    const steps = Math.max(1, Math.ceil(Math.abs(distance) / Math.max(radius / 2, 1)));
    let current = axis === 'x' ? x : y;
    for (let i = 0; i < steps; i++) {
      const next = current + distance / steps;
      const testX = axis === 'x' ? next : x;
      const testY = axis === 'y' ? next : y;
      if (collidesWithIsland(region, testX, testY, radius)) break;
      current = next;
    }
    return current;
  };
  const x = moveAxis(fromX, fromY, toX, 'x');
  const y = moveAxis(x, fromY, toY, 'y');
  return { x, y };
}
