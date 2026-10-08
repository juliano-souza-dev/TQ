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
  function close() {
    pending = null;
    element.hidden = true;
  }
  cancel.addEventListener('click', close);

  function open({
    kind, title: heading, description: explanation, id,
    family = null, afterSuccess = () => {},
  } = {}) {
    if (!kind || pending) return false;
    const region = getRegion();
    const challenge = chooseRegionChallenge(getPedagogy(), family, Math.random, region);
    pending = { kind, id, challenge, afterSuccess };
    mistakeMade = false;
    resolved = false;
    title.textContent = heading || 'Resolva a continha';
    description.textContent = explanation || 'Escolha a resposta para continuar.';
    problem.textContent = challenge.a + ' × ' + challenge.b + ' = ?';
    feedback.textContent = 'Escolha uma das quatro respostas.';
    feedback.dataset.result = '';
    answers.replaceChildren();
    for (const value of buildMultipleChoiceAnswers(challenge.answer)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'math-gate-answer';
      button.textContent = String(value);
      button.addEventListener('click', () => {
        if (!pending || resolved) return;
        if (value !== challenge.answer) {
          mistakeMade = true;
          button.disabled = true;
          button.classList.add('is-wrong');
          feedback.textContent = '✗ Tente novamente. Você consegue!';
          feedback.dataset.result = 'wrong';
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
        button.classList.add('is-correct');
        for (const item of answers.children) item.disabled = true;
        feedback.textContent = '✓ ' + (typeof result === 'string' ? result : 'Resposta correta!');
        feedback.dataset.result = 'correct';
        const callback = pending.afterSuccess;
        close();
        callback();
      });
      answers.append(button);
    }
    element.hidden = false;
    cancel.focus();
    return true;
  }
  return { element, open, close, get isOpen() { return !element.hidden; } };
}
