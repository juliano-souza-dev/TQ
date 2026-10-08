// R1/R2 parameters originate from education/pedagogy-curriculum.json (v2).
// Kept explicit for native ES module consumers without asynchronous JSON loading.
export const REGION_FAMILIES = Object.freeze({
  1: Object.freeze([2, 5, 10]),
  2: Object.freeze([2, 3, 5, 10]),
});
export const REGION_GATE = 0.75;
export const REQUIRED_QUESTIONS_PER_FAMILY = 10;
export const REQUIRED_DISTINCT_FACTORS = 8;

const whole = value => Number.isInteger(value) && value >= 0 ? value : 0;
export const familyStats = (progress = {}, family) => {
  const record = progress?.region1?.families?.[String(family)] ?? {};
  const byFactor = record.byFactor ?? {};
  const attempts = Object.values(byFactor).reduce((sum, item) => sum + whole(item?.attempts), 0);
  const clean = Object.values(byFactor).reduce((sum, item) => sum + Math.min(whole(item?.attempts), whole(item?.correctFirstTry)), 0);
  const distinct = Object.values(byFactor).filter(item => whole(item?.attempts) > 0).length;
  const accuracy = attempts ? clean / attempts : 0;
  return {
    family, attempts, clean, distinct, accuracy,
    mastered: attempts >= REQUIRED_QUESTIONS_PER_FAMILY
      && distinct >= REQUIRED_DISTINCT_FACTORS && accuracy >= REGION_GATE,
  };
};
export function getRegionMastery(progress = {}) {
  const families = REGION_FAMILIES[1].map(family => familyStats(progress, family));
  return { region: 1, families, mastered: families.every(record => record.mastered), gate: REGION_GATE };
}
export function chooseRegionChallenge(progress = {}, preferredFamily = null, random = Math.random) {
  const mastery = getRegionMastery(progress);
  const candidates = mastery.families.filter(entry => !entry.mastered);
  const preferred = Number(preferredFamily);
  const family = REGION_FAMILIES[1].includes(preferred) ? preferred
    : (candidates.sort((a, b) => a.attempts - b.attempts || a.family - b.family)[0]?.family ?? 2);
  const record = progress?.region1?.families?.[String(family)]?.byFactor ?? {};
  const factors = Array.from({ length: 10 }, (_, index) => index + 1);
  const min = Math.min(...factors.map(factor => whole(record[factor]?.attempts)));
  const leastPracticed = factors.filter(factor => whole(record[factor]?.attempts) === min);
  const value = Math.min(leastPracticed.length - 1, Math.max(0, Math.floor(random() * leastPracticed.length)));
  const factor = leastPracticed[value];
  return { id: family + 'x' + factor + ':' + String(Date.now()) + ':' + String(random()),
    family, factor, a: family, b: factor, answer: family * factor };
}
export function recordRegionChallenge(progress = {}, challenge, correctFirstTry) {
  if (!challenge || !REGION_FAMILIES[1].includes(challenge.family)
    || !Number.isInteger(challenge.factor) || challenge.factor < 1 || challenge.factor > 10) {
    return { progress, recorded: false };
  }
  const id = String(challenge.id ?? '');
  if (!id) return { progress, recorded: false };
  const region = progress.region1 ?? {};
  const answered = Array.isArray(region.answeredIds) ? region.answeredIds : [];
  if (answered.includes(id)) return { progress, recorded: false };
  const familyKey = String(challenge.family);
  const oldFamily = region.families?.[familyKey] ?? {};
  const oldFact = oldFamily.byFactor?.[String(challenge.factor)] ?? {};
  const attempts = whole(oldFact.attempts);
  const clean = Math.min(attempts, whole(oldFact.correctFirstTry));
  const nextFamily = {
    ...oldFamily,
    byFactor: {
      ...oldFamily.byFactor,
      [String(challenge.factor)]: {
        attempts: attempts + 1,
        correctFirstTry: clean + (correctFirstTry === true ? 1 : 0),
      },
    },
  };
  return { recorded: true, progress: {
    ...progress,
    region1: {
      ...region,
      answeredIds: [...answered.slice(-199), id],
      families: { ...region.families, [familyKey]: nextFamily },
    },
  } };
}
export function buildMultipleChoiceAnswers(answer, random = Math.random) {
  const choices = new Set([answer]);
  for (const offset of [1, -1, 2, -2, 5, -5, 10, -10, 3, -3, 4, -4, 7, -7]) {
    if (choices.size >= 4) break;
    if (answer + offset > 0) choices.add(answer + offset);
  }
  const items = [...choices];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1))));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
