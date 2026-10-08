// Each cannon instance occupies at most one slot on one ship.
export function equipCannon(loadout, shipId, slot, cannonId, capacity, ownedIds) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) throw new RangeError('Invalid cannon slot');
  if (!ownedIds.includes(cannonId)) throw new Error('Cannon not owned');
  const next = Object.fromEntries(Object.entries(loadout ?? {}).map(([id,slots]) => [id, [...slots]]));
  for (const slots of Object.values(next)) for (let i=0;i<slots.length;i++) if(slots[i]===cannonId) slots[i]=null;
  if (!next[shipId]) next[shipId]=Array(capacity).fill(null);
  next[shipId].length=capacity;
  next[shipId][slot]=cannonId;
  return next;
}
export function unequipCannon(loadout, shipId, slot, capacity) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) throw new RangeError('Invalid cannon slot');
  const next = Object.fromEntries(Object.entries(loadout ?? {}).map(([id,slots]) => [id, [...slots]]));
  if (!next[shipId]) next[shipId]=Array(capacity).fill(null);
  next[shipId][slot]=null;
  return next;
}
