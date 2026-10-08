import { getLearningChallenge } from '../education/LearningProgress.js';
import { createShipyard } from './Shipyard.js';
import { createMissionBoard } from './MissionBoard.js';
const CONTENT = {
  shipyard: { title: '⚓ Estaleiro', description: 'Aqui você poderá trocar de navio e equipar canhões.', items: ['Trocar navio', 'Equipar canhões'] },
  missions: { title: '📜 Missões', description: 'O quadro de missões desta região.', items: ['Missões disponíveis em breve'] },
};
export function createIslandPanel({ onAcceptFirstMission = () => {}, isFirstMissionAccepted = () => false, shipyardOptions = {}, getMissionState = () => ({}), getMissionFlow = () => ({stage:'welcome'}), onRequestNextMission = () => false, getLearningProgress = () => ({}), onLearningAttempt = () => {}, missionBoardOptions = {}, getHullHealth = () => 100, onRequestRepair = () => false } = {}) {
  const panel = document.createElement('section');
  panel.className = 'island-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Ilha');
  const card = document.createElement('div');
  card.className = 'island-panel-card';
  const title = document.createElement('h2');
  const description = document.createElement('p');
  const list = document.createElement('div');
  const shipyard = createShipyard(shipyardOptions);
  const missionBoard = createMissionBoard(missionBoardOptions);
  const repairBox = document.createElement('section');
  repairBox.className = 'shipyard-repair';
  const repairTitle = document.createElement('h3');
  repairTitle.textContent = '🔧 Reparos do casco';
  const repairDescription = document.createElement('p');
  const repairButton = document.createElement('button');
  repairButton.className = 'primary-button';
  repairButton.type = 'button';
  repairButton.textContent = 'Resolver continha para consertar';
  function refreshRepair() {
    const health = getHullHealth();
    const missing = Math.max(0, 100 - health);
    repairDescription.textContent = 'Vida atual: ' + Math.round(health) + '/100. Cada resposta correta restaura até 20 pontos de vida (' + Math.round(Math.min(20, missing)) + ' disponíveis agora).';
    repairButton.disabled = missing <= 0;
    if (missing <= 0) repairButton.textContent = '✅ Casco em perfeitas condições';
    else repairButton.textContent = '🧮 Resolver continha e recuperar até 20 PV';
  }
  repairButton.addEventListener('click', () => {
    if(getHullHealth() < 100) onRequestRepair(() => refreshRepair());
  });
  repairBox.append(repairTitle, repairDescription, repairButton);
  const acceptMission = document.createElement('button');
  acceptMission.type = 'button';
  acceptMission.className = 'primary-button';
  acceptMission.textContent = 'Aceitar primeira missão';
  acceptMission.addEventListener('click', () => {
    onAcceptFirstMission();
    acceptMission.hidden = true;
    list.replaceChildren(Object.assign(document.createElement('p'), { textContent: '✓ Missão aceita. Siga a orientação na tela.' }));
  });
  const mathBox = document.createElement('div');
  mathBox.className = 'mission-math';
  const question = document.createElement('p');
  question.className = 'mission-math-question';
  const choices = document.createElement('div');
  choices.className = 'mission-math-choices';
  const feedback = document.createElement('p');
  feedback.className = 'mission-math-feedback';
  feedback.setAttribute('aria-live', 'polite');
  let correctAnswer = 1;
  let mistakeMade = false;
  let solved = false;
  function prepareChallenge() {
    const { a, b } = getLearningChallenge(getLearningProgress());
    mistakeMade = false;
    correctAnswer = a * b;
    solved = false;
    question.textContent = 'Resolva para iniciar a próxima missão: ' + a + ' × ' + b + ' = ?';
    feedback.textContent = 'Escolha uma das quatro respostas.';
    feedback.dataset.result = '';
    choices.replaceChildren();
    const answers = new Set([correctAnswer]);
    for (const delta of [b, -b, a, -a, 1, -1, 2, -2, 10, -10]) {
      if (answers.size >= 4) break;
      if (correctAnswer + delta > 0) answers.add(correctAnswer + delta);
    }
    const shuffled = [...answers].sort(() => Math.random() - 0.5);
    for (const value of shuffled) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mission-math-option';
      button.textContent = String(value);
      button.addEventListener('click', () => {
        if (solved) return;
        if (value !== correctAnswer) {
          mistakeMade = true;
          onLearningAttempt(false, false);
          button.classList.add('is-wrong');
          button.disabled = true;
          feedback.textContent = '✗ Ainda não! Tente outra resposta.';
          feedback.dataset.result = 'wrong';
          return;
        }
        if (!onRequestNextMission(value, correctAnswer)) return;
        onLearningAttempt(true, !mistakeMade);
        solved = true;
        button.classList.add('is-correct');
        for (const option of choices.children) option.disabled = true;
        feedback.textContent = '✓ Acertou! Sua missão começou. Bons ventos, capitão!';
        feedback.dataset.result = 'correct';
      });
      choices.append(button);
    }
  }
  mathBox.append(question, choices, feedback);
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'primary-button';
  close.textContent = 'Voltar ao mar';
  close.addEventListener('click', () => { panel.hidden = true; });
  card.append(title, description, list, shipyard.element, repairBox, acceptMission, mathBox, missionBoard.element, close); panel.append(card);
  return {
    element: panel,
    get isOpen() { return !panel.hidden; },
    open(kind) {
      const content = CONTENT[kind];
      if (!content) return false;
      title.textContent = content.title;
      description.textContent = kind === 'shipyard' ? 'Gerencie sua frota e seus equipamentos.' : content.description;
      shipyard.element.hidden = kind !== 'shipyard';
      repairBox.hidden = kind !== 'shipyard';
      if (kind === 'shipyard') refreshRepair();
      list.hidden = kind === 'shipyard';
      acceptMission.hidden = kind !== 'missions' || isFirstMissionAccepted();
      const flow = getMissionFlow();
      mathBox.hidden = kind !== 'missions' || flow.stage !== 'mission';
      if (!mathBox.hidden) prepareChallenge();
      const freePlay = kind === 'missions' && ['free', 'ready2', 'stage2'].includes(flow.stage);
      missionBoard.setHidden(!freePlay);
      if (freePlay) missionBoard.show();
      list.hidden = kind === 'shipyard' || freePlay;
      if (kind === 'shipyard') shipyard.show();
      list.replaceChildren(...(kind === 'missions' ? [flow.stage === 'mission' ? 'Canhão equipado! Resolva a continha para iniciar a missão.' : flow.stage === 'combat' ? 'Missão em andamento: afunde 1 Corsário das Velas Rubras.' : flow.stage === 'next' ? 'Missão concluída: Corsário das Velas Rubras afundado!' : flow.stage === 'equip' ? 'Equipe um canhão no Estaleiro para continuar.' : 'Aceite sua primeira missão para começar.'] : content.items).map(item => {
        const p = document.createElement('p');
        p.textContent = item; return p;
      }));
      panel.hidden = false;
      close.focus();
      return true;
    },
    refreshMissionBoard() { missionBoard.refresh(); },
    refreshRepair,
    close() { panel.hidden = true; },
  };
}
