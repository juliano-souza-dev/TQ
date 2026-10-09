import {
  chooseRegionChallenge, buildMultipleChoiceAnswers,
} from '../education/RegionMastery.js';

// Reusable transactional multiplication gate. The caller owns the action;
// neither rewards nor repairs are executed before the answer is correct.
export function createMathGate({
  getPedagogy, getRegion = () => 1,
  onSolved = () => false,
} = {}) {
  const element = document.createElement('div');
  element.className = 'math-gate';
  element.hidden = true;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  element.setAttribute('aria-label', 'Desafio matemático');

  const card = document.createElement('section');
  card.className = 'math-gate-card';
  const title = document.createElement('h2');
  const description = document.createElement('p');
  const problem = document.createElement('p');
  problem.className = 'math-gate-question';
  const answers = document.createElement('div');
  answers.className = 'math-gate-answers';
  const feedback = document.createElement('p');
  feedback.className = 'math-gate-feedback';
  feedback.setAttribute('aria-live', 'polite');
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Voltar sem realizar a ação';
  cancel.className = 'secondary-button';
  card.append(title, description, problem, answers, feedback, cancel);
  element.append(card);

  let pending = null;
  let mistakeMade = false;
  let resolved = false;
  let closeTimer = null;
  let attempts = 0;
  const maxAttempts = 5;
  const vibrate = pattern => { try { globalThis.navigator?.vibrate?.(pattern); } catch {} };
  function clearFeedbackState() {
    card.classList.remove('is-answer-correct', 'is-answer-wrong');
    for (const button of answers.children) button.classList.remove('is-correct', 'is-wrong', 'is-muted', 'is-reveal-correct');
  }
  function markAnswer({ correct, chosen, expected, revealExpected = true }) {
    clearFeedbackState();
    card.classList.add(correct ? 'is-answer-correct' : 'is-answer-wrong');
    for (const button of answers.children) {
      if (button === chosen) button.classList.add(correct ? 'is-correct' : 'is-wrong');
      else if (!button.disabled) button.classList.add('is-muted');
      if (!correct && revealExpected && Number(button.textContent) === expected) {
        button.classList.remove('is-muted');
        button.classList.add('is-correct', 'is-reveal-correct');
      }
    }
    vibrate(correct ? 35 : [45, 55, 45]);
  }
  function close() {
    if (pending?.locked && pending?.getLocked?.()) return false;
    const completed = pending;
    if (closeTimer !== null) clearTimeout(closeTimer);
    closeTimer = null;
    pending = null;
    element.hidden = true;
    completed?.onClose?.();
    return true;
  }
  cancel.addEventListener('click', () => { if (!resolved) close(); });

  function open({
    kind, title: heading, description: explanation, id,
    family = null, afterSuccess = () => {}, repeatOnSuccess = false,
    locked = false, getLocked = () => false, onClose = () => {},
  } = {}) {
    if (!kind || pending) return false;
    clearFeedbackState();
    cancel.disabled = locked && getLocked();
    const region = getRegion();
    const challenge = chooseRegionChallenge(getPedagogy(), family, Math.random, region);
    pending = { kind, id, challenge, afterSuccess, family, region, repeatOnSuccess, locked, getLocked, onClose };
    attempts = 0;
    mistakeMade = false;
    resolved = false;
    title.textContent = heading || 'Resolva a continha';
    description.textContent = explanation || 'Escolha a resposta para continuar.';
    function renderRound() {
    const challenge = pending.challenge;
    clearFeedbackState();
    problem.textContent = challenge.a + ' × ' + challenge.b + ' = ?';
    feedback.textContent = 'Tentativa ' + (attempts + 1) + '/' + maxAttempts + '. Escolha uma resposta.';
    feedback.dataset.result = '';
    answers.replaceChildren();
    for (const value of buildMultipleChoiceAnswers(challenge.answer)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'math-gate-answer';
      button.textContent = String(value);
      button.addEventListener('click', () => {
        if (!pending || resolved) return;
        attempts++;
        if (value !== challenge.answer) {
          mistakeMade = true;
          resolved = true;
          for (const item of answers.children) item.disabled = true;
          cancel.disabled = true;
          markAnswer({ correct: false, chosen: button, expected: challenge.answer });
          feedback.textContent = attempts >= maxAttempts && !pending.repeatOnSuccess
            ? '✕ Cinco erros. Tesouro fechado, tente novamente mais tarde.'
            : '✕ Errou! A correta está em verde. Preparando outra continha...';
          feedback.dataset.result = 'wrong';
          closeTimer = setTimeout(() => {
            closeTimer = null;
            if (!pending) return;
            if (attempts >= maxAttempts && !pending.repeatOnSuccess) { close(); return; }
            if (attempts >= maxAttempts) attempts = 0;
            pending.challenge = chooseRegionChallenge(getPedagogy(), pending.family, Math.random, pending.region);
            resolved = false;
            cancel.disabled = pending.locked && pending.getLocked();
            renderRound();
          }, 850);
          return;
        }
        // Gate actions are validated once more against current saved state,
        // preventing repeated loot and stale mission acceptances.
        const result = onSolved(pending, !mistakeMade);
        if (result === false) {
          feedback.textContent = 'A ação não está mais disponível. Volte e tente novamente.';
          feedback.dataset.result = 'wrong';
          return;
        }
        resolved = true;
        markAnswer({ correct: true, chosen: button, expected: challenge.answer });
        for (const item of answers.children) item.disabled = true;
        cancel.disabled = true;
        feedback.textContent = '✓ ' + (typeof result === 'string' ? result : 'Resposta correta!');
        feedback.dataset.result = 'correct';
        const callback = pending.afterSuccess;
        closeTimer = setTimeout(() => {
          if (!pending) return;
          if (pending.repeatOnSuccess) {
            callback();
            if (pending.locked && pending.getLocked()) {
              pending.challenge = chooseRegionChallenge(getPedagogy(), pending.family, Math.random, pending.region);
              attempts = 0;
              resolved = false;
              cancel.disabled = true;
              renderRound();
            } else close();
          } else {
            close();
            callback();
          }
        }, 850);
      });
      answers.append(button);
    }
    }
    renderRound();
    element.hidden = false;
    if (!cancel.disabled) cancel.focus();
    else answers.querySelector?.('button')?.focus?.();
    return true;
  }
  return { element, open, close, get isOpen() { return !element.hidden; } };
}
