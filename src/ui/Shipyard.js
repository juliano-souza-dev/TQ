import { STARTER_SHIP, ROSE_GOLD_SHIP, getShipSpriteUrl } from '../ships/ShipRegistry.js';
import { loadShipSprite } from '../ships/ShipSpriteLoader.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

export function createShipyard({ ships = [STARTER_SHIP, ROSE_GOLD_SHIP], equippedShipId = STARTER_SHIP.id, cannons = [] } = {}) {
  const root = el('div', 'shipyard');
  const tabs = el('div', 'shipyard-tabs');
  tabs.setAttribute('role', 'tablist');
  const content = el('div', 'shipyard-content');
  const tabButtons = {};
  const views = {};

  for (const [id, title] of [['ships', '⛵ Navios'], ['cannons', '💣 Canhões']]) {
    const button = el('button', 'shipyard-tab', title);
    button.type = 'button'; button.setAttribute('role', 'tab');
    button.id = 'shipyard-tab-' + id;
    button.setAttribute('aria-controls', 'shipyard-view-' + id);
    const view = el('section', 'shipyard-view');
    view.id = 'shipyard-view-' + id;
    view.setAttribute('role', 'tabpanel');
    view.setAttribute('aria-labelledby', button.id);
    button.addEventListener('click', () => selectTab(id));
    tabs.append(button); content.append(view);
    tabButtons[id] = button; views[id] = view;
  }
  function selectTab(id) {
    for (const key of Object.keys(tabButtons)) {
      const active = key === id;
      tabButtons[key].classList.toggle('active', active);
      tabButtons[key].setAttribute('aria-selected', String(active));
      tabButtons[key].tabIndex = active ? 0 : -1;
      views[key].hidden = !active;
    }
  }
  function stat(label, value) {
    const item = el('div', 'shipyard-stat');
    item.append(el('span', '', label), el('strong', '', String(value)));
    return item;
  }
  function renderShips() {
    const view = views.ships;
    view.replaceChildren();
    view.append(el('h3', '', 'Sua frota'));
    const ordered = [...ships].sort((a, b) => Number(b.id === equippedShipId) - Number(a.id === equippedShipId));
    for (const ship of ordered) {
      const equipped = ship.id === equippedShipId;
      const card = el('article', 'shipyard-ship-card' + (equipped ? ' is-equipped' : ''));
      const head = el('div', 'shipyard-ship-head');
      head.append(el('h4', '', ship.name), el('span', 'shipyard-status', equipped ? '✓ Equipado' : 'Catalogado'));
      card.append(head);
      const body = el('div', 'shipyard-ship-body');
      const preview = el('div', 'shipyard-preview');
      const sprite = el('div', 'shipyard-sprite');
      sprite.style.backgroundImage = 'url("' + getShipSpriteUrl(ship) + '")';
      if (ship.sprite.chromaKey) {
        loadShipSprite(ship).then(image => { sprite.style.backgroundImage = 'url("' + image.toDataURL('image/png') + '")'; }).catch(console.error);
      }
      preview.append(sprite);
      const stats = el('div', 'shipyard-stats');
      stats.append(
        stat('❤️ Vida máxima', ship.maxHealth ?? 'Não definida'),
        stat('⚡ Velocidade inicial', ship.speed?.initial ?? 'Não definida'),
        stat('↔ Velocidade mín./máx.', ship.speed ? ship.speed.min + ' / ' + ship.speed.max : 'Não definida'),
        stat('💣 Espaços para canhões', ship.cannonSlots ?? 'Não definido'),
      );
      body.append(preview, stats); card.append(body);
      if (!equipped) card.append(el('p', 'shipyard-note', 'Navio catalogado. Ainda não adquirido ou desbloqueado.'));
      view.append(card);
    }
    if (ships.length === 1) view.append(el('p', 'shipyard-note', 'Você possui 1 navio. Novas embarcações aparecerão aqui quando forem desbloqueadas.'));
  }
  function renderCannons() {
    const view = views.cannons;
    view.replaceChildren(el('h3', '', 'Canhões da frota'));
    const equipped = ships.find(ship => ship.id === equippedShipId);
    view.append(el('p', 'shipyard-note', 'Capacidade do navio equipado: ' + (equipped?.cannonSlots ?? 'não definida') + ' espaços.'));
    if (!cannons.length) {
      const empty = el('div', 'shipyard-empty');
      empty.append(el('span', 'shipyard-empty-icon', '💣'), el('strong', '', 'Nenhum canhão cadastrado'), el('p', '', 'Quando você conquistar ou adquirir canhões, eles aparecerão aqui para gerenciamento.'));
      view.append(empty);
    } else {
      for (const cannon of cannons) {
        const card = el('article', 'shipyard-cannon-card');
        card.append(el('strong', '', cannon.name), el('span', '', cannon.equipped ? 'Equipado' : 'Disponível'));
        view.append(card);
      }
    }
  }
  root.append(tabs, content);
  return {
    element: root,
    show() { renderShips(); renderCannons(); selectTab('ships'); },
  };
}
