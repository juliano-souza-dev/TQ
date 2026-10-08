// Regras independentes do renderizador: monstros sangram somente após receber dano.
export const CRITICAL_MONSTER_HEALTH_RATIO = 0.25;
export const MONSTER_BLEED_DURATION_MS = 1400;

export function monsterHealthRatio(monster) {
  const max = Number(monster?.maxHealth);
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(1, (Number(monster.health) || 0) / max));
}

export function damageMonster(monster, damage, now = 0) {
  if (!monster || monster.type !== 'monster' || monster.health <= 0) return null;
  const amount = Number(damage);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const previous = monster.health;
  monster.health = Math.max(0, previous - amount);
  const dealt = previous - monster.health;
  if (dealt <= 0) return null;
  const critical = monster.health > 0 && monsterHealthRatio(monster) <= CRITICAL_MONSTER_HEALTH_RATIO;
  monster.blood = {
    startedAt: now,
    expiresAt: now + MONSTER_BLEED_DURATION_MS,
    intensity: critical ? 2.7 : 1,
    critical,
  };
  if (monster.health <= 0) monster.state = 'defeated';
  return { damage: dealt, health: monster.health, critical, defeated: monster.health <= 0 };
}

export function monsterBloodLevel(monster, now) {
  if (!monster || monster.type !== 'monster' || monster.health <= 0) return 0;
  const hit = monster.blood;
  const burst = hit && now < hit.expiresAt
    ? Math.max(0, (hit.expiresAt - now) / MONSTER_BLEED_DURATION_MS) * hit.intensity : 0;
  // Com <= 25% de vida, o monstro sangra continuamente até ser derrotado.
  const persistent = monsterHealthRatio(monster) <= CRITICAL_MONSTER_HEALTH_RATIO ? 0.55 : 0;
  return Math.min(3, burst + persistent);
}
