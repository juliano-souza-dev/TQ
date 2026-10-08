import { createShipyard } from './Shipyard.js';
const CONTENT = {
  shipyard: { title: '⚓ Estaleiro', description: 'Aqui você poderá trocar de navio e equipar canhões.', items: ['Trocar navio', 'Equipar canhões'] },
  missions: { title: '📜 Missões', description: 'O quadro de missões desta região.', items: ['Missões disponíveis em breve'] },
};
export function createIslandPanel({ onAcceptFirstMission = () => {}, isFirstMissionAccepted = () => false, shipyardOptions = {}, getMissionState = () => ({}), onRequestNextMission = () => false } = {}) {
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
  const acceptMission = document.createElement('button');
  acceptMission.type = 'button';
  acceptMission.className = 'primary-button';
  acceptMission.textContent = 'Aceitar primeira missão';
  acceptMission.addEventListener('click', () => {
    onAcceptFirstMission();
    acceptMission.hidden = true;
    list.replaceChildren(Object.assign(document.createElement('p'), { textContent: '✓ Primeira missão aceita: visite o Estaleiro e prepare seu canhão.' }));
  });
  const mathBox = document.createElement('div');
  mathBox.className = 'mission-math';
  const question = document.createElement('p');
  question.textContent = 'Resolva para iniciar a próxima missão: 3 × 4 = ?';
  const answer = document.createElement('input');
  answer.type = 'number';
  answer.inputMode = 'numeric';
  answer.placeholder = 'Resposta';
  answer.setAttribute('aria-label', 'Resposta da continha');
  const feedback = document.createElement('p');
  feedback.setAttribute('aria-live', 'polite');
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.className = 'primary-button';
  submit.textContent = 'Confirmar resposta';
  submit.addEventListener('click', () => {
    if (onRequestNextMission(answer.value)) {
      feedback.textContent = '✓ Correto! Missão iniciada.';
      submit.hidden = true;
    } else {
      feedback.textContent = 'Tente novamente, capitão!';
      answer.focus();
    }
  });
  mathBox.append(question, answer, submit, feedback);
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'primary-button';
  close.textContent = 'Voltar ao mar';
  close.addEventListener('click', () => { panel.hidden = true; });
  card.append(title, description, list, shipyard.element, acceptMission, mathBox, close); panel.append(card);
  return {
    element: panel,
    get isOpen() { return !panel.hidden; },
    open(kind) {
      const content = CONTENT[kind];
      if (!content) return false;
      title.textContent = content.title;
      description.textContent = kind === 'shipyard' ? 'Gerencie sua frota e seus equipamentos.' : content.description;
      shipyard.element.hidden = kind !== 'shipyard';
      list.hidden = kind === 'shipyard';
      acceptMission.hidden = kind !== 'missions' || isFirstMissionAccepted();
      const mission = getMissionState();
      mathBox.hidden = kind !== 'missions' || mission.firstMission !== 'equipped';
      feedback.textContent = '';
      answer.value = '';
      submit.hidden = false;
      if (kind === 'shipyard') shipyard.show();
      list.replaceChildren(...(kind === 'missions' ? [mission.firstMission === 'equipped' ? 'Canhão equipado! Resolva a continha para receber a próxima missão.' : mission.navigation === 'active' ? 'Missão em andamento: navegue 300 metros.' : mission.navigation === 'complete' ? 'Missão concluída: você navegou 300 metros!' : 'Primeira missão: visite o Estaleiro e prepare seu canhão.'] : content.items).map(item => {
        const p = document.createElement('p');
        p.textContent = item; return p;
      }));
      panel.hidden = false;
      close.focus();
      return true;
    },
    close() { panel.hidden = true; },
  };
}
