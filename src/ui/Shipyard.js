import { equipCannon, unequipCannon } from '../items/CannonLoadout.js';
import { CANNONS, EVENTS, isItemVisible, isItemOwned, getCannonAssetUrl } from '../items/EquipmentCatalog.js';
import { STARTER_SHIP, ROSE_GOLD_SHIP, getShipSpriteUrl } from '../ships/ShipRegistry.js';
import { loadShipSprite } from '../ships/ShipSpriteLoader.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

export function createShipyard({ ships = [STARTER_SHIP, ROSE_GOLD_SHIP], equippedShipId = STARTER_SHIP.id, ownedShipIds = [STARTER_SHIP.id], cannons = CANNONS, events = EVENTS, ownedCannonIds = [], equippedCannonIds = [], loadout = {}, getEquipment = () => ({}), onLoadoutChange = () => {}, onEquipShip = () => false } = {}) {
  let currentLoadout = loadout;
  let currentOwnedCannonIds = ownedCannonIds;
  let currentOwnedShipIds = [...new Set([STARTER_SHIP.id, ...ownedShipIds])];
  let currentCannonCounts = {};
  let currentEquippedShipId = equippedShipId;
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
    const ownedShips = ships.filter(ship => ship.id === currentEquippedShipId || currentOwnedShipIds.includes(ship.id));
    const ordered = [...ownedShips].sort((a, b) => Number(b.id === currentEquippedShipId) - Number(a.id === currentEquippedShipId));
    for (const ship of ordered) {
      const equipped = ship.id === currentEquippedShipId;
      const card = el('article', 'shipyard-ship-card' + (equipped ? ' is-equipped' : ''));
      const head = el('div', 'shipyard-ship-head');
      head.append(el('h4', '', ship.name));
      if (equipped) head.append(el('span', 'shipyard-status', '✓ Equipado'));
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
      if (!equipped) {
        const button = el('button', 'primary-button', 'Equipar');
        button.type = 'button';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            if (await onEquipShip(ship.id)) {
              currentEquippedShipId = ship.id;
              renderShips();
              renderCannons();
            } else button.disabled = false;
          } catch (error) { console.error('Falha ao equipar navio', error); button.disabled = false; }
        });
        card.append(button);
      }
      view.append(card);
    }
    if (!ownedShips.length) view.append(el('p', 'shipyard-note', 'Nenhum navio adquirido.'));
  }
  function renderCannons() {
    const view = views.cannons;
    view.replaceChildren(el('h3', '', 'Canhões da frota'));
    const equipped = ships.find(ship => ship.id === currentEquippedShipId);
    view.append(el('div', 'shipyard-cannon-capacity', '💣 '+(equipped?.cannonSlots ?? 0)+' espaços para canhões · Toque para equipar ou retirar'));
    const capacity = equipped?.cannonSlots ?? 0;
    const slots = currentLoadout[currentEquippedShipId] ?? [];
    const ownedCannons = cannons.filter(cannon => isItemVisible(cannon, events) && (isItemOwned(cannon, currentOwnedCannonIds) || (Number(currentCannonCounts[cannon.id]) || 0) > 0));
    const ownedIds = ownedCannons.map(cannon => cannon.id);
    const usedCounts = slots.filter(Boolean).reduce((counts, id) => { counts[id] = (counts[id] || 0) + 1; return counts; }, {});
    const slotsBox=el('div','shipyard-cannon-slots');
    const strength=c=>Number(c.damageMultiplier)||1;
    const sortedAvailable=()=>ownedCannons.filter(c=>
      (Number(currentCannonCounts[c.id])||(c.acquisition?.type==='starter'?1:0))>(usedCounts[c.id]||0))
      .sort((a,b)=>strength(b)-strength(a)||(Number(b.range)||0)-(Number(a.range)||0));
    function chooseCannon(index){
      const overlay=el('div','shipyard-cannon-dialog-backdrop');
      const dialog=el('section','shipyard-cannon-dialog');
      dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
      dialog.setAttribute('aria-label','Equipar canhão na posição '+(index+1));
      const header=el('div','shipyard-cannon-dialog-header');
      const heading=el('h3','','⚓ Escolha um canhão · Posição '+(index+1));
      const close=el('button','shipyard-cannon-dialog-close','✕');
      close.type='button';close.setAttribute('aria-label','Fechar seleção');
      const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onKey);};
      const onKey=e=>{if(e.key==='Escape')dismiss();};
      close.addEventListener('click',dismiss);
      overlay.addEventListener('click',e=>{if(e.target===overlay)dismiss();});
      document.addEventListener('keydown',onKey);
      header.append(heading,close);dialog.append(header);
      const available=sortedAvailable();
      if(!available.length)dialog.append(el('p','shipyard-note','Nenhum canhão livre no inventário.'));
      for(const item of available){
        const option=el('button','shipyard-cannon-choice');
        option.type='button';
        const art=el('img','shipyard-cannon-choice-art');
        art.src=getCannonAssetUrl(item);art.alt='';
        const details=el('div','shipyard-cannon-choice-details');
        details.append(el('strong','',item.name));
        const relative=Math.max(1,Math.min(5,Math.ceil(strength(item)/2.2*5)));
        const tier=el('span','shipyard-cannon-tier tier-'+relative,'▲'.repeat(relative));
        tier.setAttribute('aria-label','Força nível '+relative+' de 5');
        details.append(tier);
        const meta=el('div','shipyard-cannon-choice-stats');
        meta.append(el('span','','💥 ×'+item.damageMultiplier),
          el('span','','🎯 '+(item.range??'?')+' m'),
          el('span','','⏱ '+item.reloadSeconds+' s'));
        details.append(meta);option.append(art,details);
        option.addEventListener('click',()=>{
          const availableCounts={...currentCannonCounts,
            'blue-gold-pirate':Number(currentCannonCounts['blue-gold-pirate'])||1};
          const updated=equipCannon(currentLoadout,currentEquippedShipId,index,item.id,capacity,ownedIds,availableCounts);
          if(updated===currentLoadout)return;
          currentLoadout=updated;onLoadoutChange(currentLoadout);
          dismiss();renderCannons();
        });
        dialog.append(option);
      }
      overlay.append(dialog);document.body.append(overlay);close.focus();
    }
    for(let index=0;index<capacity;index++){
      const cannonId=slots[index]??null;
      const cannon=ownedCannons.find(item=>item.id===cannonId);
      const slot=el('div','shipyard-cannon-slot'+(cannon?' is-equipped':' is-empty'));
      slot.append(el('strong','shipyard-slot-heading','SLOT '+(index+1)));
      if(cannon){
        const art=el('img','shipyard-slot-cannon-art');art.src=getCannonAssetUrl(cannon);art.alt=cannon.name;
        slot.append(art,el('span','shipyard-slot-cannon-name',cannon.name));
        const remove=el('button','shipyard-slot-remove','Desequipar');
        remove.type='button';
        remove.addEventListener('click',()=>{
          currentLoadout=unequipCannon(currentLoadout,currentEquippedShipId,index,capacity);
          onLoadoutChange(currentLoadout);renderCannons();
        });
        slot.append(remove);
      }else{
        const add=el('button','shipyard-slot-add','＋');
        add.type='button';add.setAttribute('aria-label','Equipar canhão no slot '+(index+1));
        add.title='Escolher canhão';
        add.addEventListener('click',()=>chooseCannon(index));
        slot.append(add,el('span','shipyard-slot-empty','Equipar canhão'));
      }
      slotsBox.append(slot);
    }
    view.append(slotsBox);
    view.append(el('h4', '', 'Canhões no inventário'));
    for (const cannon of ownedCannons) {
      const card = el('article', 'shipyard-cannon-card');
      const image = el('img', 'shipyard-cannon-image');
      image.src = getCannonAssetUrl(cannon);
      image.alt = cannon.name;
      image.loading = 'lazy';
      image.style.cssText = 'width:76px;height:76px;object-fit:contain;flex-shrink:0';
      const info = el('div', 'shipyard-cannon-info');
      info.append(el('strong', '', cannon.name));
      const stats=el('div','shipyard-cannon-stat-badges');
      stats.append(
        el('span','shipyard-cannon-chip','📦 '+(Number(currentCannonCounts[cannon.id]) || (cannon.acquisition?.type === 'starter' ? 1 : 0))+' no inventário'),
        el('span','shipyard-cannon-chip','⚓ '+(usedCounts[cannon.id] || 0)+' equipados'));
      if(cannon.reloadSeconds != null)stats.append(
        el('span','shipyard-cannon-chip','⏱ '+cannon.reloadSeconds+'s'),
        el('span','shipyard-cannon-chip','🎯 '+Math.round(cannon.accuracy*100)+'%'),
        el('span','shipyard-cannon-chip','💥 ×'+cannon.damageMultiplier),
        el('span','shipyard-cannon-chip','🔩 '+cannon.caliberPounder));
      info.append(stats);
      card.append(image, info);
      view.append(card);
    }
    if (!ownedCannons.length) view.append(el('p', 'shipyard-note', 'Nenhum canhão no inventário.'));

  }
  root.append(tabs, content);
  return {
    element: root,
    show() { const fresh = getEquipment(); currentLoadout = fresh.loadout ?? loadout; currentOwnedCannonIds = fresh.ownedCannonIds ?? ownedCannonIds; currentOwnedShipIds = [...new Set([STARTER_SHIP.id, ...(fresh.ownedShipIds ?? ownedShipIds)])]; currentCannonCounts = fresh.cannonCounts ?? {}; currentEquippedShipId = fresh.equippedShipId ?? equippedShipId; renderShips(); renderCannons(); selectTab('ships'); },
  };
}
