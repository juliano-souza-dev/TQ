import {
  chooseRegionChallenge, buildMultipleChoiceAnswers, REGION_FAMILIES,
} from '../education/RegionMastery.js';

// UI-only mission board. Campaign rules, rewards and quiz scoring live elsewhere.
export function createMissionBoard({
  getBoard = () => null,
  getPedagogy = () => ({}),
  onAccept = () => false,
  onClaim = () => false,
  onPracticeAnswer = () => false,
  onStartRegion2 = () => false,
} = {}) {
  const element = document.createElement('section');
  element.className = 'campaign-board';
  element.setAttribute('aria-label', 'Quadro de missões da R1');

  const title = document.createElement('h3');
  title.textContent = '🏴‍☠️ Contratos da Enseada';
  const intro = document.createElement('p');
  intro.className = 'campaign-intro';
  intro.textContent = 'Escolha sua rota: lute, explore ou treine a tabuada. As missões podem ser feitas em qualquer ordem, conforme ficam disponíveis.';
  const progressLine = document.createElement('p');
  progressLine.className = 'campaign-progress';
  const masteryPanel = document.createElement('div');
  masteryPanel.className = 'campaign-mastery';
  const controls = document.createElement('div');
  controls.className = 'campaign-stage-controls';
  const missions = document.createElement('div');
  missions.className = 'campaign-missions';
  const practice = document.createElement('section');
  practice.className = 'campaign-practice';
  const practiceHeader = document.createElement('h3');
  practiceHeader.textContent = '🧮 Academia das Tabuadas';
  const practiceInfo = document.createElement('p');
  practiceInfo.textContent = 'Resolva continhas para melhorar seu domínio e cumprir contratos de matemática.';
  const families = document.createElement('div');
  families.className = 'campaign-family-options';
  const question = document.createElement('p');
  question.className = 'campaign-question';
  const answers = document.createElement('div');
  answers.className = 'campaign-answer-options';
  const feedback = document.createElement('p');
  feedback.className = 'campaign-answer-feedback';
  feedback.setAttribute('aria-live', 'polite');
  const next = document.createElement('button');
  next.className = 'secondary-button campaign-next';
  next.textContent = 'Próxima continha';
  next.type = 'button';
  next.hidden = true;
  practice.append(practiceHeader, practiceInfo, families, question, answers, feedback, next);
  element.append(title, intro, progressLine, masteryPanel, controls, missions, practice);

  let current = null;
  let currentFamily = 2;
  let mistakeMade = false;
  let answered = false;
  function button(label, action, className = 'secondary-button') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = label;
    element.addEventListener('click', action);
    return element;
  }
  function prepare(family = currentFamily) {
    const board = getBoard();
    currentFamily = family;
    current = chooseRegionChallenge(getPedagogy(), family, Math.random, board?.activeRegion ?? 1);
    answered = false;
    mistakeMade = false;
    question.textContent = current.a + ' × ' + current.b + ' = ?';
    feedback.textContent = 'Escolha uma das quatro respostas.';
    feedback.dataset.result = '';
    next.hidden = true;
    answers.replaceChildren();
    for (const value of buildMultipleChoiceAnswers(current.answer)) {
      const choice = button(String(value), () => {
        if (answered) return;
        if (value !== current.answer) {
          mistakeMade = true;
          choice.classList.add('is-wrong');
          choice.disabled = true;
          feedback.textContent = '✗ Ainda não! Releia a conta e tente novamente.';
          feedback.dataset.result = 'wrong';
          return;
        }
        if (!onPracticeAnswer(current, !mistakeMade)) {
          feedback.textContent = 'Não foi possível salvar a resposta. Tente novamente.';
          feedback.dataset.result = 'wrong';
          return;
        }
        answered = true;
        choice.classList.add('is-correct');
        for (const node of answers.children) node.disabled = true;
        feedback.textContent = mistakeMade
          ? '✓ Conseguiu! Esta conta será revisada para ganhar precisão.'
          : '✓ Excelente! Resposta correta na primeira tentativa.';
        feedback.dataset.result = 'correct';
        next.hidden = false;
        refresh(false);
      }, 'campaign-answer');
      answers.append(choice);
    }
  }
  next.addEventListener('click', () => prepare(currentFamily));

  function refresh(resetPractice = false) {
    const board = getBoard();
    if (!board) return;
    title.textContent = board.activeRegion >= 2
      ? '🌊 Etapa 2 · Novas Tabuadas' : '🏴‍☠️ Contratos da Enseada';
    const essentialTotal = board.missions.filter(m => !m.optional).length;
    progressLine.textContent = 'Missões principais: ' + board.essentialClaimed + '/' + essentialTotal
      + ' concluídas · ' + board.active.length + ' ativas · ' + board.claimable.length + ' com recompensa';
    masteryPanel.replaceChildren();
    masteryPanel.append(Object.assign(document.createElement('strong'), {
      textContent: 'Domínio necessário da R1: 75% por família, 10 desafios e 8 fatores diferentes.',
    }));
    for (const item of board.mastery.families) {
      const line = document.createElement('p');
      line.textContent = (item.mastered ? '✅ ' : '📖 ') + 'Tabuada do ' + item.family
        + ': ' + item.attempts + '/10 desafios · ' + item.distinct
        + '/8 fatores · precisão ' + Math.round(item.accuracy * 100) + '%';
      masteryPanel.append(line);
    }

    controls.replaceChildren();
    if (board.unlockedRegion >= 2) {
      const banner = document.createElement('p');
      banner.className = 'campaign-unlocked';
      banner.textContent = board.activeRegion >= 2
        ? '🎉 Etapa 2 iniciada! A tabuada do 3 entrou nos seus desafios.'
        : '🎉 Etapa 2 desbloqueada! Agora você pode começar a próxima fase pedagógica.';
      controls.append(banner);
      if (board.activeRegion < 2) controls.append(button('Iniciar etapa 2', () => {
        if (onStartRegion2()) { refresh(true); prepare(3); }
      }, 'primary-button'));
    } else {
      const missing = document.createElement('p');
      missing.textContent = 'Para avançar: conclua O Último Bloqueio da R1 e domine as tabuadas do 2, 5 e 10.';
      controls.append(missing);
    }

    const order = { ready: 0, active: 1, available: 2, locked: 3, claimed: 4 };
    missions.replaceChildren();
    const sorted = [...board.missions].sort((a, b) =>
      order[a.status] - order[b.status] || a.tier - b.tier);
    for (const mission of sorted) {
      const card = document.createElement('article');
      card.className = 'campaign-contract campaign-contract--' + mission.status;
      const heading = document.createElement('h4');
      heading.textContent = (mission.optional ? '🎃 ' : '📜 ') + mission.name;
      const description = document.createElement('p');
      description.textContent = mission.description;
      const rewards = document.createElement('p');
      rewards.className = 'campaign-reward';
      rewards.textContent = '🎁 ' + mission.reward.gold + ' ouro · '
        + mission.reward.iron + ' bolas de ferro'
        + (mission.reward.halloween ? ' · ' + mission.reward.halloween + ' bolas Halloween' : '');
      const objectives = document.createElement('div');
      objectives.className = 'campaign-objectives';
      mission.objectives.forEach((objective, index) => {
        const row = document.createElement('p');
        const value = mission.progress[index] ?? 0;
        const count = objective.kind === 'travel' ? Math.floor(value) : value;
        row.textContent = (value >= objective.count ? '✅ ' : '◻️ ')
          + objective.label + ': ' + count + '/' + objective.count;
        objectives.append(row);
      });
      card.append(heading, description, objectives, rewards);
      if (mission.status === 'available') {
        card.append(button('Aceitar missão', () => {
          if (onAccept(mission.id)) refresh();
        }, 'primary-button'));
      } else if (mission.status === 'ready') {
        card.append(button('Receber recompensa', () => {
          if (onClaim(mission.id)) refresh();
        }, 'primary-button'));
      } else {
        const status = document.createElement('p');
        status.className = 'campaign-status';
        status.textContent = mission.status === 'locked'
          ? '🔒 Disponível após avançar em outras missões.'
          : mission.status === 'claimed' ? '✅ Missão recompensada' : '⚓ Em andamento';
        card.append(status);
      }
      missions.append(card);
    }
    families.replaceChildren();
    const activeFamilies = REGION_FAMILIES[board.activeRegion] ?? REGION_FAMILIES[1];
    for (const family of activeFamilies) {
      const active = button('Tabuada do ' + family, () => prepare(family),
        family === currentFamily ? 'primary-button' : 'secondary-button');
      families.append(active);
    }
    if (resetPractice || !current || !activeFamilies.includes(currentFamily)) {
      prepare(activeFamilies.includes(currentFamily) ? currentFamily : activeFamilies[0]);
    }
  }
  return { element, show: () => { element.hidden = false; refresh(true); }, refresh, setHidden: value => { element.hidden = value; } };
}
