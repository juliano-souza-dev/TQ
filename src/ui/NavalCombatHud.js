const MESSAGES = Object.freeze({
  mission: 'Aceite uma missão no Porto das Missões para combater.',
  'no-cannon': 'Equipe um canhão no Estaleiro.',
  target: 'Toque num navio inimigo para selecionar o alvo.',
  range: 'Alvo fora do alcance dos seus canhões.',
  ammo: 'Sem munição para disparar.',
  sunk: 'O casco está destruído. Repare o navio.',
});

export function createNavalCombatHud(controller) {
  const element = document.createElement('aside');
  element.className = 'combat-hud';
  element.setAttribute('aria-label', 'Combate naval');

  const hull = document.createElement('span');
  hull.className = 'combat-hull';
  const ammoSelect = document.createElement('select');
  ammoSelect.className = 'combat-ammo-select';
  ammoSelect.setAttribute('aria-label', 'Selecionar munição');
  const ammoQuantity = document.createElement('span');
  ammoQuantity.className = 'combat-ammo-quantity';
  const fireButton = document.createElement('button');
  fireButton.className = 'primary-button';
  fireButton.type = 'button';
  const feedback = document.createElement('span');
  feedback.className = 'combat-feedback';
  feedback.setAttribute('aria-live', 'polite');

  element.append(hull, ammoSelect, ammoQuantity, fireButton, feedback);
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
