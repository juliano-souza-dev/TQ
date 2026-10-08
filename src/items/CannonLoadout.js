// Cada instância de canhão ocupa um único slot. Canhões iguais podem ocupar slots distintos.
export function equipCannon(loadout, shipId, slot, cannonId, capacity, ownedIds, counts = {}) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) throw new RangeError('Invalid cannon slot');
  if (!ownedIds.includes(cannonId)) throw new Error('Cannon not owned');
  const next = Object.fromEntries(Object.entries(loadout ?? {}).map(([id, slots]) => [id, [...slots]]));
  if (!next[shipId]) next[shipId] = Array(capacity).fill(null);
  next[shipId].length = capacity;
  const limit = Number.isFinite(Number(counts[cannonId]))
    ? Math.max(0, Math.floor(Number(counts[cannonId]))) : 1;
  // Retirar do slot atual não consome outra unidade.
  const used = Object.entries(next).reduce((total, [id, slots]) =>
    total + slots.filter((value, index) => value === cannonId && !(id === shipId && index === slot)).length, 0);
  if (used >= limit) throw new Error('Not enough cannon instances');
  next[shipId][slot] = cannonId;
  return next;
}
export function unequipCannon(loadout, shipId, slot, capacity) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) throw new RangeError('Invalid cannon slot');
  const next = Object.fromEntries(Object.entries(loadout ?? {}).map(([id,slots]) => [id, [...slots]]));
  if (!next[shipId]) next[shipId]=Array(capacity).fill(null);
  next[shipId][slot]=null;
  return next;
}
