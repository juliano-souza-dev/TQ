import { createShipyard } from './Shipyard.js';
const CONTENT = {
  shipyard: { title: '⚓ Estaleiro', description: 'Aqui você poderá trocar de navio e equipar canhões.', items: ['Trocar navio', 'Equipar canhões'] },
  missions: { title: '📜 Missões', description: 'O quadro de missões desta região.', items: ['Missões disponíveis em breve'] },
};
export function createIslandPanel() {
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
  const shipyard = createShipyard();
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'primary-button';
  close.textContent = 'Voltar ao mar';
  close.addEventListener('click', () => { panel.hidden = true; });
  card.append(title, description, list, shipyard.element, close); panel.append(card);
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
      if (kind === 'shipyard') shipyard.show();
      list.replaceChildren(...content.items.map(item => {
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
