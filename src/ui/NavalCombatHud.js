const MESSAGES = Object.freeze({
  mission: 'Aceite uma missão no Porto das Missões para combater.',
  'no-cannon': 'Equipe um canhão no Estaleiro.',
  'harpoon-ammo': 'Sem Arpões do Marujo para atacar monstros.',
  target: 'Toque num navio inimigo para selecionar o alvo.',
  range: 'Alvo fora do alcance dos seus canhões.',
  ammo: 'Sem munição para disparar.',
  'ammo-type': 'Este canhão só dispara sua munição especial. Selecione o Orbe Autoguiado Aetherion.',
  'thief-equipment': 'A missão exige a Fragata Caçadora das Sombras com o Canhão Aetherion MK-I.',
  sunk: 'O casco está destruído. Repare o navio.',
});

export function createNavalCombatHud(controller, { onRepair = () => false, onCenterShip = () => false, isCameraDetached = () => false } = {}) {
  const element = document.createElement('aside');
  element.className = 'combat-hud';
  element.setAttribute('aria-label', 'Combate naval');

  const hull = document.createElement('span');
  hull.className = 'combat-hull';
  // Gameplay repair control: available anywhere at sea, not in the shipyard.
  const repairButton = document.createElement('button');
  repairButton.type = 'button';
  repairButton.className = 'naval-repair-button';
  const repairIcon = document.createElement('img');
  repairIcon.className = 'naval-repair-icon';
  repairIcon.alt = '';
  repairIcon.draggable = false;
  const repairEnabledUrl = new URL('../../assets/ui/hud/consertar_navio.webp', import.meta.url).href;
  const repairBlockedUrl = new URL('../../assets/ui/hud/consertar_navio_bloqueado.webp', import.meta.url).href;
  repairIcon.src = repairBlockedUrl;
  repairButton.append(repairIcon);
  repairButton.setAttribute('aria-label', 'Reparar navio resolvendo uma continha');
  repairButton.title = 'Reparar casco: 20% da vida máxima por continha';
  const centerButton = document.createElement('button');
  centerButton.type = 'button';
  centerButton.className = 'naval-center-button';
  centerButton.setAttribute('aria-label', 'Centralizar câmera no navio');
  const centerIcon = document.createElement('img');
  centerIcon.className = 'naval-center-icon';
  centerIcon.alt = '';
  centerIcon.draggable = false;
  centerIcon.src = new URL('../../assets/ui/hud/centralizar_navio.webp', import.meta.url).href;
  centerButton.append(centerIcon);
  const hullRow = document.createElement('div');
  hullRow.className = 'combat-hull-row';
  hullRow.append(hull);
  const ammoSelect = document.createElement('select');
  ammoSelect.className = 'combat-ammo-select';
  ammoSelect.setAttribute('aria-label', 'Selecionar munição');
  const ammoQuantity = document.createElement('span');
  const cannonQuantity = document.createElement('span');
  cannonQuantity.className = 'combat-cannon-quantity';
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

  const attackControls = document.createElement('div');
  attackControls.className = 'combat-attack-controls';
  // Attack moves left, repair takes the original rightmost attack position.
  const consumablesWrap = document.createElement('div');
  consumablesWrap.className = 'naval-consumables-wrap';
  const consumablesButton = document.createElement('button');
  consumablesButton.type = 'button';
  consumablesButton.className = 'naval-consumables-button';
  consumablesButton.setAttribute('aria-label', 'Selecionar consumível');
  const frame = document.createElement('img');
  frame.className = 'naval-consumables-frame';
  frame.src = new URL('../../assets/ui/hud/consumiveis_slot.png',import.meta.url).href;
  frame.alt = '';
  const selectedIcon = document.createElement('img');
  selectedIcon.className = 'naval-consumables-icon';
  selectedIcon.src = new URL('../../assets/consumables/5X-em-Chamas.png',import.meta.url).href;
  // Compatibility while the hyphenated asset is being uploaded to the repository.
  selectedIcon.onerror = () => { selectedIcon.onerror=null; selectedIcon.src=new URL('../../assets/consumables/5X em Chamas.png',import.meta.url).href; };
  selectedIcon.alt = '';
  const countLabel = document.createElement('span');
  countLabel.className = 'naval-consumables-count';
  consumablesButton.append(frame,selectedIcon,countLabel);
  const picker = document.createElement('div');
  picker.className = 'naval-consumables-picker';
  picker.hidden = true;
  const noneOption = document.createElement('button');
  noneOption.type = 'button';
  noneOption.textContent = '🔒 Nenhum consumível';
  const flameOption = document.createElement('button');
  flameOption.type = 'button';
  const shieldOption = document.createElement('button');
  shieldOption.type='button';
  const activateOption = document.createElement('button');
  activateOption.type = 'button';
  activateOption.className = 'naval-consumables-activate';
  picker.append(noneOption,flameOption,shieldOption,activateOption);
  consumablesWrap.append(consumablesButton,picker);
  attackControls.append(fireButton, fireIconButton, consumablesWrap, centerButton, repairButton);
  element.append(hullRow, ammoSelect, ammoQuantity, cannonQuantity, attackControls, feedback);
  let optionFingerprint = '';

  function setFeedback(text) {
    feedback.textContent = String(text || '');
  }

  function refresh() {
    const consumable=controller.getConsumables();
    const shieldSelected=consumable.selectedId==='shield',noneSelected=consumable.selectedId==='none';
    const now=Date.now();
    const remaining=Math.max(0,Math.ceil(((shieldSelected?consumable.shieldCooldownUntil:consumable.cooldownUntil)-now)/1000));
    const active=Math.max(0,Math.ceil(((shieldSelected?consumable.shieldActiveUntil:consumable.activeUntil)-now)/1000));
    const qty=Math.max(0,Number(consumable.quantities[consumable.selectedId])||0);
    selectedIcon.hidden=noneSelected||shieldSelected;
    countLabel.textContent=noneSelected?'🔒':shieldSelected?'🛡️ '+qty:String(qty);
    flameOption.textContent='🔥 5X em Chamas · '+(consumable.quantities['flame-5x']||0)+' unidades';
    shieldOption.textContent='🛡️ Escudo · '+(consumable.quantities.shield||0)+' unidades';
    activateOption.textContent=active?'Ativo: '+active+'s':remaining?'⏳ Recarga: '+remaining+'s':shieldSelected?'🛡️ Ativar escudo (45s)':'🔥 Ativar 5X (60s)';
    activateOption.disabled=active>0||remaining>0||qty<=0||noneSelected;
        const cameraDetached = Boolean(isCameraDetached());
    centerButton.disabled = !cameraDetached;
    centerButton.classList.toggle('is-available', cameraDetached);
    centerButton.classList.toggle('is-blocked', !cameraDetached);
    centerButton.setAttribute('aria-disabled', String(!cameraDetached));
    centerButton.title = cameraDetached ? 'Centralizar a câmera no navio' : 'Câmera acompanhando o navio';
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
    ammoQuantity.textContent = status.harpoonFiring || controller.getTarget()?.type === 'monster'
      ? '⚓ ' + status.harpoonAmmo + ' Arpões do Marujo'
      : '⚫ ' + status.ammo + ' munições';
    const equipped = Number(status.equippedCannons);
    const inRange = Number(status.cannonsInRange);
    cannonQuantity.textContent = Number.isFinite(equipped) && Number.isFinite(inRange)
      ? '💣 Canhões: ' + equipped + ' equipados · ' + inRange + ' no alcance'
      : '💣 Contagem de canhões indisponível. Atualize o jogo.';
    const recovering = Boolean(controller.readSave?.().combat?.repairingUntil);
    hull.textContent = '❤️ Casco: ' + Math.round(status.health) + '/100' + (recovering ? ' · curando' : '');
    const repairAvailable = status.health < 100 && !recovering;
    repairButton.disabled = !repairAvailable;
    repairIcon.src = repairAvailable ? repairEnabledUrl : repairBlockedUrl;
    repairButton.classList.toggle('is-available', repairAvailable);
    repairButton.classList.toggle('is-blocked', !repairAvailable);
    repairButton.setAttribute('aria-disabled', String(repairButton.disabled));
    repairButton.title = recovering ? 'Recuperação em andamento (10 segundos)' : status.health >= 100
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

  consumablesButton.addEventListener('click', () => { picker.hidden = !picker.hidden; refresh(); });
  noneOption.addEventListener('click', () => {controller.selectConsumable('none');picker.hidden=true;refresh();});
  flameOption.addEventListener('click', () => {controller.selectConsumable('flame-5x');picker.hidden=false;refresh();});
  shieldOption.addEventListener('click',()=>{controller.selectConsumable('shield');refresh();});
  activateOption.addEventListener('click', () => {
    const result = controller.activateConsumable();
    setFeedback(result.reason);
    picker.hidden = result.ok;
    refresh();
  });
    // Em telas touch, o evento click de um segundo dedo pode ser suprimido
  // pelo navegador enquanto o primeiro dedo mantém o joystick pressionado.
  // Capturamos cada toque diretamente no botão, sem capturar o ponteiro do
  // joystick. Mouse, teclado e tecnologias assistivas continuam usando click.
  function bindFireControl(button) {
    let lastTouchAt = -Infinity;
    button.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || button.disabled) return;
      lastTouchAt = performance.now();
      event.preventDefault(); // Evita click sintetizado duplicado após o toque.
      controller.toggleFire();
      refresh();
    });
    button.addEventListener('click', event => {
      if (event.detail !== 0 && performance.now() - lastTouchAt < 650) {
        event.preventDefault();
        return;
      }
      controller.toggleFire();
      refresh();
    });
  }
  bindFireControl(fireIconButton);
  bindFireControl(fireButton);
  let lastCenterTouchAt = -Infinity;
  function centerShip() {
    if (centerButton.disabled) return;
    onCenterShip();
    refresh();
  }
  centerButton.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || centerButton.disabled) return;
    lastCenterTouchAt = performance.now();
    event.preventDefault();
    centerShip();
  });
  centerButton.addEventListener('click', event => {
    if (event.detail !== 0 && performance.now() - lastCenterTouchAt < 650) return;
    centerShip();
  });
  // Separate pointer from the joystick: the second finger can repair while sailing.
  let lastRepairTouchAt = -Infinity;
  repairButton.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || repairButton.disabled) return;
    lastRepairTouchAt = performance.now();
    event.preventDefault();
    if (controller.getHealth() < 100) onRepair();
  });
  repairButton.addEventListener('click', event => {
    if (event?.detail !== 0 && performance.now() - lastRepairTouchAt < 650) return;
    if (!repairButton.disabled && controller.getHealth() < 100) onRepair();
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
