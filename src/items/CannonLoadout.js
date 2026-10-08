// Cada instância de canhão ocupa um único slot. Canhões iguais podem ocupar slots distintos.
export function equipCannon(loadout, shipId, slot, cannonId, capacity, ownedIds, counts = {}) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= capacity) throw new RangeError('Invalid cannon slot');
  if (!ownedIds.includes(cannonId)) throw new Error('Cannon not owned');
  const next = Object.fromEntries(Object.entries(loadout ?? {}).map(([id, slots]) => [id, [...slots]]));
  if (!next[shipId]) next[shipId] = Array(capacity).fill(null);
  next[shipId].length = capacity;
  const limit = Number.isFinite(Number(counts[cannonId]))
    ? Math.max(0, Math.floor(Number(counts[cannonId]))) : 1;
  // A quantidade é limitada por navio, não pela soma dos navios da conta.
  // O mesmo canhão pode integrar a configuração de vários navios.
  const used = next[shipId].filter((value, index) => value === cannonId && index !== slot).length;
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
