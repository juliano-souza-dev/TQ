import { CANNONS, EVENTS, isItemVisible, isItemOwned, getCannonAssetUrl } from '../items/EquipmentCatalog.js';
import { STARTER_SHIP, ROSE_GOLD_SHIP, getShipSpriteUrl } from '../ships/ShipRegistry.js';
import { loadShipSprite } from '../ships/ShipSpriteLoader.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

export function createShipyard({ ships = [STARTER_SHIP, ROSE_GOLD_SHIP], equippedShipId = STARTER_SHIP.id, ownedShipIds = [STARTER_SHIP.id], cannons = CANNONS, events = EVENTS, ownedCannonIds = [] } = {}) {
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
    const ownedShips = ships.filter(ship => ownedShipIds.includes(ship.id));
    const ordered = [...ownedShips].sort((a, b) => Number(b.id === equippedShipId) - Number(a.id === equippedShipId));
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
    if (!ownedShips.length) view.append(el('p', 'shipyard-note', 'Nenhum navio adquirido.'));
  }
  function renderCannons() {
    const view = views.cannons;
    view.replaceChildren(el('h3', '', 'Canhões da frota'));
    const equipped = ships.find(ship => ship.id === equippedShipId);
    view.append(el('p', 'shipyard-note', 'Capacidade do navio equipado: ' + (equipped?.cannonSlots ?? 'não definida') + ' espaços.'));
    const visibleCannons = cannons.filter(cannon => isItemVisible(cannon, events) && isItemOwned(cannon, ownedCannonIds));
    for (const cannon of visibleCannons) {
      const owned = isItemOwned(cannon, ownedCannonIds);
      const card = el('article', 'shipyard-cannon-card');
      const image = el('img', 'shipyard-cannon-image');
      image.src = getCannonAssetUrl(cannon);
      image.alt = cannon.name;
      image.loading = 'lazy';
      image.style.cssText = 'width:76px;height:76px;object-fit:contain;flex-shrink:0';
      const info = el('div', 'shipyard-cannon-info');
      info.append(el('strong', '', cannon.name),
        el('span', '', owned ? (cannon.equipped ? 'Equipado' : 'Adquirido') : 'Bloqueado'));
      if (cannon.reloadSeconds != null) {
        info.append(el('p', 'shipyard-note',
          'Recarga: ' + cannon.reloadSeconds + ' s | Precisão: ' +
          Math.round(cannon.accuracy * 100) + '% | Dano: ' +
          cannon.damageMultiplier + '× | Calibre: ' + cannon.caliberPounder + ' pounder'));
      }
      if (!owned && cannon.acquisition.type === 'event-reward') {
        info.append(el('p', 'shipyard-note', 'Recompensa do evento; obtenção ainda não configurada.'));
      } else if (!owned) {
        info.append(el('p', 'shipyard-note', 'Forma de obtenção ainda não definida.'));
      }
      card.append(image, info);
      view.append(card);
    }
    if (!visibleCannons.length) view.append(el('p', 'shipyard-note', 'Nenhum canhão disponível neste momento.'));

  }
  root.append(tabs, content);
  return {
    element: root,
    show() { renderShips(); renderCannons(); selectTab('ships'); },
  };
}
