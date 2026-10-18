// R1/R2 parameters originate from education/pedagogy-curriculum.json (v2).
// Kept explicit for native ES module consumers without asynchronous JSON loading.
export const REGION_FAMILIES = Object.freeze({
  1: Object.freeze([2, 5, 10]),
  2: Object.freeze([2, 3, 5, 10]),
  3: Object.freeze([3, 4]),
  4: Object.freeze([3, 4, 6]),
  5: Object.freeze([2, 3, 4, 5, 6, 10]),
  6: Object.freeze([6, 7]),
  7: Object.freeze([7, 8]),
  8: Object.freeze([8]),
  9: Object.freeze([7, 8, 9]),
  10: Object.freeze([2, 3, 4, 5, 6, 7, 8, 9, 10]),
  11: Object.freeze([2, 3, 4, 5, 6, 7, 8, 9, 10]),
  12: Object.freeze([2, 3, 4, 5, 6, 7, 8, 9, 10]),
});
export const REGION_GATE = 0.75;
export const REQUIRED_QUESTIONS_PER_FAMILY = 10;
export const REQUIRED_DISTINCT_FACTORS = 8;

const whole = value => Number.isInteger(value) && value >= 0 ? value : 0;
export const familyStats = (progress = {}, family, region = 1) => {
  const record = progress?.['region' + region]?.families?.[String(family)] ?? {};
  const byFactor = record.byFactor ?? {};
  const attempts = Object.values(byFactor).reduce((sum, item) => sum + whole(item?.attempts), 0);
  const clean = Object.values(byFactor).reduce((sum, item) => sum + Math.min(whole(item?.attempts), whole(item?.correctFirstTry)), 0);
  const distinct = Object.values(byFactor).filter(item => whole(item?.attempts) > 0).length;
  const accuracy = attempts ? clean / attempts : 0;
  return {
    family, attempts, clean, distinct, accuracy,
    mastered: attempts >= REQUIRED_QUESTIONS_PER_FAMILY
      && distinct >= REQUIRED_DISTINCT_FACTORS && accuracy >= (region>=10?.8:REGION_GATE),
  };
};
export function getRegionMastery(progress = {}, region = 1) {
  const selectedRegion = REGION_FAMILIES[region] ? region : 1;
  const families = REGION_FAMILIES[selectedRegion].map(family => familyStats(progress, family, selectedRegion));
  return { region: selectedRegion, families, mastered: families.every(record => record.mastered), gate: selectedRegion>=10?.8:REGION_GATE };
}
export function chooseRegionChallenge(progress = {}, preferredFamily = null, random = Math.random, region = 1) {
  const selectedRegion = REGION_FAMILIES[region] ? region : 1;
  const mastery = getRegionMastery(progress, selectedRegion);
  const candidates = mastery.families.filter(entry => !entry.mastered);
  const preferred = Number(preferredFamily);
  const family = REGION_FAMILIES[selectedRegion].includes(preferred) ? preferred
    : (candidates.sort((a, b) => a.attempts - b.attempts || a.family - b.family)[0]?.family ?? 2);
  const record = progress?.['region' + selectedRegion]?.families?.[String(family)]?.byFactor ?? {};
  const factors = Array.from({ length: 10 }, (_, index) => index + 1);
  const min = Math.min(...factors.map(factor => whole(record[factor]?.attempts)));
  const leastPracticed = factors.filter(factor => whole(record[factor]?.attempts) === min);
  const value = Math.min(leastPracticed.length - 1, Math.max(0, Math.floor(random() * leastPracticed.length)));
  const factor = leastPracticed[value];
  return { id: selectedRegion + ':' + family + 'x' + factor + ':' + String(Date.now()) + ':' + String(random()),
    region: selectedRegion, family, factor, a: family, b: factor, answer: family * factor };
}
export function recordRegionChallenge(progress = {}, challenge, correctFirstTry) {
  const regionId = REGION_FAMILIES[challenge?.region] ? challenge.region : 1;
  if (!challenge || !REGION_FAMILIES[regionId].includes(challenge.family)
    || !Number.isInteger(challenge.factor) || challenge.factor < 1 || challenge.factor > 10) {
    return { progress, recorded: false };
  }
  const id = String(challenge.id ?? '');
  if (!id) return { progress, recorded: false };
  const region = progress['region' + regionId] ?? {};
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
    ['region' + regionId]: {
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
