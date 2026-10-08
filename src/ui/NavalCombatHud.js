const MESSAGES = Object.freeze({
  mission: 'Aceite uma missão no Porto das Missões para combater.',
  'no-cannon': 'Equipe um canhão no Estaleiro.',
  target: 'Toque num navio inimigo para selecionar o alvo.',
  range: 'Alvo fora do alcance dos seus canhões.',
  ammo: 'Sem munição para disparar.',
  sunk: 'O casco está destruído. Repare o navio.',
});

export function createNavalCombatHud(controller, { onRepair = () => false } = {}) {
  const element = document.createElement('aside');
  element.className = 'combat-hud';
  element.setAttribute('aria-label', 'Combate naval');

  const hull = document.createElement('span');
  hull.className = 'combat-hull';
  // Gameplay repair control: available anywhere at sea, not in the shipyard.
  const repairButton = document.createElement('button');
  repairButton.type = 'button';
  repairButton.className = 'naval-repair-button';
  repairButton.textContent = '🔧';
  repairButton.setAttribute('aria-label', 'Reparar navio resolvendo uma continha');
  repairButton.title = 'Reparar casco: 20% da vida máxima por continha';
  const hullRow = document.createElement('div');
  hullRow.className = 'combat-hull-row';
  hullRow.append(hull, repairButton);
  repairButton.addEventListener('click', () => {
    if (controller.getHealth() < 100) onRepair();
  });
  const ammoSelect = document.createElement('select');
  ammoSelect.className = 'combat-ammo-select';
  ammoSelect.setAttribute('aria-label', 'Selecionar munição');
  const ammoQuantity = document.createElement('span');
  ammoQuantity.className = 'combat-ammo-quantity';
  const fireButton = document.createElement('button');
  fireButton.className = 'primary-button';
  fireButton.type = 'button';
  // Botão ilustrado separado, mantendo o controle textual original para testes.
  const fireIconButton = document.createElement('button');
  fireIconButton.type = 'button';
  fireIconButton.className = 'combat-fire-icon-button';
  fireIconButton.setAttribute('aria-label', 'Iniciar disparos');
  const fireIcon = document.createElement('img');
  fireIcon.className = 'combat-fire-icon';
  fireIcon.alt = '';
  fireIcon.draggable = false;
  const startFireUrl = new URL('../../assets/ui/hud/start_fire.webp', import.meta.url).href;
  const cancelAttackUrl = new URL('../../assets/ui/hud/cancel_attack.webp', import.meta.url).href;
  fireIcon.src = startFireUrl;
  fireIconButton.append(fireIcon);
  const feedback = document.createElement('span');
  feedback.className = 'combat-feedback';
  feedback.setAttribute('aria-live', 'polite');

  element.append(hullRow, ammoSelect, ammoQuantity, fireIconButton, fireButton, feedback);
  let optionFingerprint = '';

  function setFeedback(text) {
    feedback.textContent = String(text || '');
  }

  function refresh() {
    const status = controller.getStatus();
    const choices = status.options.filter(item => item.amount > 0 || item.id === status.ammoId);
    const fingerprint = choices.map(item => item.id + ':' + (item.amount > 0)).join('|');
    if (fingerprint !== optionFingerprint) {
      optionFingerprint = fingerprint;
      ammoSelect.replaceChildren(...choices.map(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        option.disabled = item.amount <= 0;
        return option;
      }));
    }
    ammoSelect.value = status.ammoId;
    ammoSelect.disabled = !choices.some(item => item.amount > 0);
    ammoQuantity.textContent = '⚫ ' + status.ammo + ' munições';
    hull.textContent = '❤️ Casco: ' + status.health + '/100';
    repairButton.disabled = status.health >= 100;
    repairButton.setAttribute('aria-disabled', String(repairButton.disabled));
    repairButton.title = status.health >= 100
      ? 'Navio com vida completa'
      : 'Reparar casco com continha (+20 PV por acerto)';
    // A imagem indica exatamente o estado retornado pelo controlador de batalha.
    const iconUrl = status.firing ? cancelAttackUrl : startFireUrl;
    if (fireIcon.src !== iconUrl) fireIcon.src = iconUrl;
    fireIconButton.disabled = !status.ready && !status.firing;
    fireIconButton.classList.toggle('is-firing', status.firing);
    fireIconButton.classList.toggle('is-unavailable', !status.ready && !status.firing);
    fireIconButton.setAttribute('aria-label', status.firing ? 'Cancelar ataque' : 'Iniciar disparos');
    fireIconButton.title = status.firing ? 'Cancelar ataque' : status.ready
      ? 'Iniciar disparos' : (MESSAGES[status.reason] || '');
    fireButton.textContent = status.firing ? '⏹ Parar disparos' : '💥 Atirar';
    fireButton.disabled = !status.ready && !status.firing;
    fireButton.classList.toggle('is-firing', status.firing);
    fireButton.title = status.ready || status.firing
      ? 'Disparos automáticos com os canhões equipados'
      : (MESSAGES[status.reason] || '');
    if (!status.firing && !status.ready && !feedback.textContent) {
      feedback.textContent = MESSAGES[status.reason] || '';
    }
  }

  fireIconButton.addEventListener('click', () => {
    controller.toggleFire();
    refresh();
  });
  fireButton.addEventListener('click', () => {
    controller.toggleFire();
    refresh();
  });
  ammoSelect.addEventListener('change', () => {
    if (!controller.setAmmo(ammoSelect.value)) {
      setFeedback('Munição indisponível.');
    } else {
      setFeedback('Munição selecionada.');
    }
    refresh();
  });
  refresh();
  return { element, refresh, setFeedback };
}
