// Pedagogical sequence: no random multiplication tables before mastery.
export const INITIAL_LESSONS = Object.freeze([
  [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],[1,9],[1,10],
  [2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[2,9],[2,10],
]);
export function getLearningChallenge(progress = {}) {
  const index = Math.max(0, Math.min(INITIAL_LESSONS.length - 1, Number(progress.lessonIndex) || 0));
  const [a,b] = INITIAL_LESSONS[index];
  return { a, b, answer:a*b, index };
}
export function recordLearningAnswer(progress = {}, correct, firstAttempt = true) {
  const attempts = (progress.attempts || 0) + 1;
  const errors = (progress.errors || 0) + (correct ? 0 : 1);
  const cleanStreak = correct && firstAttempt ? (progress.cleanStreak || 0) + 1 : 0;
  const advance = correct && firstAttempt && cleanStreak >= 2;
  return {
    lessonIndex: Math.min(INITIAL_LESSONS.length - 1, (progress.lessonIndex || 0) + (advance ? 1 : 0)),
    attempts, errors, cleanStreak: advance ? 0 : cleanStreak,
  };
}
