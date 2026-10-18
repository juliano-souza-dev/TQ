import { AMMUNITION, getAmmunitionAssetUrl } from '../items/EquipmentCatalog.js';
import { NAVAL_AMMO } from '../combat/NavalBattleRules.js';
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

export function createNavalCombatHud(controller, { onRepair = () => false, onCenterShip = () => false, isCameraDetached = () => false, layoutMode = null } = {}) {
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
  const ammoWrap = document.createElement('div');
  ammoWrap.className = 'naval-ammo-wrap';
  const ammoButton = document.createElement('button');
  ammoButton.type = 'button';
  ammoButton.className = 'naval-ammo-button';
  ammoButton.setAttribute('aria-label', 'Selecionar munição');
  const ammoFrame = document.createElement('img');
  ammoFrame.className = 'naval-consumables-frame';
  ammoFrame.src = new URL('../../assets/ui/hud/consumiveis_slot.png', import.meta.url).href;
  ammoFrame.alt = '';
  const ammoIcon = document.createElement('img');
  ammoIcon.className = 'naval-consumables-icon';
  ammoIcon.alt = '';
  const ammoCount = document.createElement('span');
  ammoCount.className = 'naval-consumables-count';
  ammoButton.append(ammoFrame, ammoIcon, ammoCount);
  const ammoPicker = document.createElement('div');
  ammoPicker.className = 'naval-ammo-picker';
  ammoPicker.hidden = true;
  ammoWrap.append(ammoButton, ammoPicker);
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
  const fireRing=document.createElement('span');
  fireRing.className='portrait-fire-ring';fireRing.setAttribute('aria-hidden','true');
  fireIconButton.append(fireIcon,fireRing);
  // Explicit opt-in; changes only the input trigger, never combat rules.
  const autoButton=document.createElement('button');
  autoButton.type='button';autoButton.className='portrait-auto-fire';autoButton.textContent='AUTO';
  let autoAimEnabled=false;
  try{autoAimEnabled=localStorage.getItem('tq_auto_aim')==='true';}catch{}
  function syncAutoButton(){
    autoButton.setAttribute('aria-pressed',String(autoAimEnabled));
    autoButton.setAttribute('aria-label',autoAimEnabled?'Desativar disparo automático':'Ativar disparo automático');
    autoButton.title=autoAimEnabled?'Disparo automático ativo. Toque para desligar.':'Disparar automaticamente ao alcançar um alvo';
    fireIconButton.classList.toggle('is-auto-enabled',autoAimEnabled);
  }
  function setAutoAim(enabled){
    autoAimEnabled=Boolean(enabled);
    try{localStorage.setItem('tq_auto_aim',String(autoAimEnabled));}catch{}
    syncAutoButton();
  }
  syncAutoButton();
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
  selectedIcon.alt = '';
  const countLabel = document.createElement('span');
  countLabel.className = 'naval-consumables-count';
  const abilityCooldown=document.createElement('span');
  abilityCooldown.className='portrait-ability-cooldown';
  abilityCooldown.setAttribute('aria-hidden','true');abilityCooldown.hidden=true;
  consumablesButton.append(frame,selectedIcon,countLabel,abilityCooldown);
  const picker = document.createElement('div');
  picker.className = 'naval-consumables-picker';
  picker.hidden = true;
  const flameAssetUrl = new URL('../../assets/consumables/5X-em-Chamas.png',import.meta.url).href;
  function createConsumableOption({name,image,emoji}) {
    const button=document.createElement('button');
    button.type='button';
    button.className='naval-consumable-option';
    const iconWrap=document.createElement('span');
    iconWrap.className='naval-consumable-option-visual';
    if(image) {
      const img=document.createElement('img');
      img.className='naval-consumable-option-image';
      img.src=image;
      img.alt='';
      iconWrap.append(img);
    } else {
      const glyph=document.createElement('span');
      glyph.className='naval-consumable-option-emoji';
      glyph.textContent=emoji;
      iconWrap.append(glyph);
    }
    const quantity=document.createElement('span');
    quantity.className='naval-consumable-option-quantity';
    const spinner=document.createElement('span');
    spinner.className='naval-consumable-option-spinner';
    spinner.hidden=true;
    spinner.setAttribute('aria-hidden','true');
    iconWrap.append(quantity,spinner);
    const copy=document.createElement('span');
    copy.className='naval-consumable-option-copy';
    const heading=document.createElement('span');
    heading.className='naval-consumable-option-name';
    heading.textContent=name;
    const detail=document.createElement('span');
    detail.className='naval-consumable-option-detail';
    copy.append(heading,detail);
    button.append(iconWrap,copy);
    return {button,quantity,spinner,detail};
  }
  const noneOption=document.createElement('button');
  noneOption.type='button';
  noneOption.className='naval-consumable-none-option';
  noneOption.textContent='🔒 Nenhum consumível';
  const flameItem=createConsumableOption({name:'5X em Chamas',image:flameAssetUrl});
  const doubleDamageItem=createConsumableOption({name:'Dano 2×',emoji:'💥'});
  const shieldItem=createConsumableOption({name:'Escudo',emoji:'🛡️'});
  const speedItem=createConsumableOption({name:'Veloz+',emoji:'💨'});
  const mapItem=createConsumableOption({name:'Mapa do Tesouro',emoji:'🗺️'});
  const areaFreezeItem=createConsumableOption({name:'Congelamento em Área',emoji:'❄️'});
  const flameOption=flameItem.button;
  const doubleDamageOption=doubleDamageItem.button;
  const shieldOption=shieldItem.button;
  const speedOption=speedItem.button;
  const mapOption=mapItem.button;
  const areaFreezeOption=areaFreezeItem.button;
  picker.append(noneOption,flameOption,doubleDamageOption,shieldOption,speedOption,mapOption,areaFreezeOption);
  consumablesWrap.append(consumablesButton,picker);
  attackControls.append(fireButton, fireIconButton, autoButton, consumablesWrap, centerButton, repairButton);
  const statusPanel=document.createElement('div');
  statusPanel.className='portrait-status-panel';
  const statusToggle=document.createElement('button');
  statusToggle.type='button';statusToggle.className='portrait-status-toggle';
  statusToggle.setAttribute('aria-label','Recolher informações do casco e da munição');
  const statusSummary=document.createElement('span');
  statusSummary.className='portrait-status-summary';
  const statusTrack=document.createElement('span');
  statusTrack.className='portrait-hull-track';statusTrack.setAttribute('aria-hidden','true');
  const statusFill=document.createElement('span');statusFill.className='portrait-hull-fill';
  statusTrack.append(statusFill);
  statusToggle.append(statusSummary,statusTrack);
  const statusDetails=document.createElement('div');statusDetails.className='portrait-status-details';
  statusDetails.append(hullRow,ammoQuantity);
  statusPanel.append(statusToggle,statusDetails);
  const abilityDock=document.createElement('div');abilityDock.className='portrait-ability-dock';
  const labels=[
    [ammoButton,'Munição'],[consumablesButton,'Poderes'],
    [centerButton,'Câmera'],[repairButton,'Reparo']
  ];
  for(const [button,name] of labels){
    const label=document.createElement('span');
    label.className='portrait-ability-label';label.textContent=name;label.setAttribute('aria-hidden','true');
    button.append(label);
  }
  let statusCollapsed=true;
  try{const old=localStorage.getItem('tq_status_collapsed');
    if(old!==null)statusCollapsed=old==='true';}catch{}
  function syncStatusCollapse(){
    statusPanel.classList.toggle('is-collapsed',statusCollapsed);
    statusToggle.setAttribute('aria-expanded',String(!statusCollapsed));
    statusToggle.setAttribute('aria-label',statusCollapsed?'Expandir informações do navio':'Recolher informações do navio');
  }
  statusToggle.addEventListener('click',()=>{
    statusCollapsed=!statusCollapsed;
    try{localStorage.setItem('tq_status_collapsed',String(statusCollapsed));}catch{}
    syncStatusCollapse();
  });
  syncStatusCollapse();
  const isPortrait=()=>layoutMode?.value==='mobile-portrait'
    ||(!layoutMode&&document.documentElement.dataset.tqLayout==='mobile-portrait');
  // Keep the original desktop button arrangement by restoring the same DOM
  // nodes on rotation. Never recreate a battle controller, canvas or loop.
  let portraitMounted=null,optionFingerprint='',cannonFingerprint='',automaticFeedback='',feedbackTimer=null;
  function mountLayout(){
    const portrait=isPortrait();
    if(portraitMounted===portrait)return;
    portraitMounted=portrait;cannonFingerprint='';
    if(portrait){
      abilityDock.append(ammoWrap,consumablesWrap,centerButton,repairButton);
      element.append(statusPanel,abilityDock,cannonQuantity,attackControls,feedback);
    }else{
      attackControls.append(fireButton,fireIconButton,autoButton,consumablesWrap,centerButton,repairButton);
      element.append(statusPanel,ammoWrap,cannonQuantity,attackControls,feedback);
    }
    element.classList.toggle('is-portrait',portrait);
  }
  element.append(statusPanel,ammoWrap,cannonQuantity,attackControls,feedback);
  element.addEventListener('pointerdown',event=>event.stopPropagation());
  element.addEventListener('pointerup',event=>event.stopPropagation());
  element.addEventListener('click',event=>event.stopPropagation());
  function setText(node,value){const next=String(value);if(node.textContent!==next)node.textContent=next;}
  function vibrate(pattern){
    if(!isPortrait())return;
    try{if(typeof navigator!=='undefined'&&'vibrate' in navigator)navigator.vibrate(pattern);}catch{}
  }


  function setFeedback(text) {
    automaticFeedback = '';
    setText(feedback,text||'');
    if(isPortrait()&&text){
      feedback.classList.add('is-visible');
      if(feedbackTimer)clearTimeout(feedbackTimer);
      feedbackTimer=setTimeout(()=>feedback.classList.remove('is-visible'),2000);
    }
  }

  function refresh() {
    const consumable=controller.getConsumables();
    const shieldSelected=consumable.selectedId==='shield';
    const noneSelected=consumable.selectedId==='none';
    const flameQty=Math.max(0,Math.floor(Number(consumable.quantities['flame-5x'])||0));
    const doubleQty=Math.max(0,Math.floor(Number(consumable.quantities['double-damage'])||0));
    const doubleSelected=consumable.selectedId==='double-damage';
    const shieldQty=Math.max(0,Math.floor(Number(consumable.quantities.shield)||0));
    const speedQty=Math.max(0,Math.floor(Number(consumable.quantities['speed-plus'])||0));
    const mapQty=Math.max(0,Math.floor(Number(consumable.quantities['treasure-map'])||0));
    const areaFreezeQty=Math.max(0,Math.floor(Number(consumable.quantities['area-freeze'])||0));
    const speedSelected=consumable.selectedId==='speed-plus';
    const mapSelected=consumable.selectedId==='treasure-map';
    const areaFreezeSelected=consumable.selectedId==='area-freeze';
    const qty=doubleSelected?doubleQty:shieldSelected?shieldQty:speedSelected?speedQty:mapSelected?mapQty:areaFreezeSelected?areaFreezeQty:flameQty;
    selectedIcon.hidden=noneSelected||doubleSelected||shieldSelected||speedSelected||mapSelected||areaFreezeSelected;
    const quantityLabel=(isPortrait()?'×':'')+Number(qty).toLocaleString('pt-BR');
    setText(countLabel,noneSelected?'🔒':doubleSelected?'💥 '+quantityLabel:shieldSelected?'🛡️ '+quantityLabel
      :speedSelected?'💨 '+quantityLabel:mapSelected?'🗺️ '+quantityLabel:areaFreezeSelected?'❄️ '+quantityLabel:quantityLabel);
    flameOption.hidden=flameQty<=0;
    doubleDamageOption.hidden=doubleQty<=0&&!consumable.doubleDamageEnabled;
    shieldOption.hidden=shieldQty<=0;
    speedOption.hidden=speedQty<=0;
    mapOption.hidden=mapQty<=0;
    areaFreezeOption.hidden=areaFreezeQty<=0;
    const now=Date.now();
    const flameRemaining=Math.max(0,Math.ceil((consumable.cooldownUntil-now)/1000));
    const shieldRemaining=Math.max(0,Math.ceil((consumable.shieldCooldownUntil-now)/1000));
    const speedRemaining=Math.max(0,Math.ceil((consumable.speedCooldownUntil-now)/1000));
    const mapRemaining=Math.max(0,Math.ceil((consumable.treasureMapCooldownUntil-now)/1000));
    const formatTime=seconds=>Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    const abilityRemaining={
      'flame-5x':flameRemaining,shield:shieldRemaining,'speed-plus':speedRemaining,
      'treasure-map':mapRemaining,'double-damage':0,'area-freeze':0,
    }[consumable.selectedId]??0;
    abilityCooldown.hidden=!isPortrait()||abilityRemaining<=0;
    if(abilityRemaining>0)setText(abilityCooldown,abilityRemaining+'s');
    consumablesButton.classList.toggle('is-recharging',abilityRemaining>0);
    consumablesButton.setAttribute('aria-label',abilityRemaining>0
      ?'Selecionar consumível, recarga em '+abilityRemaining+' segundos':'Selecionar consumível');
    for(const [item,quantity,left,until,selected] of [
      [flameItem,flameQty,flameRemaining,consumable.activeUntil,consumable.selectedId==='flame-5x'],
      [doubleDamageItem,doubleQty,0,0,doubleSelected],
      [shieldItem,shieldQty,shieldRemaining,consumable.shieldActiveUntil,shieldSelected],
      [speedItem,speedQty,speedRemaining,consumable.speedActiveUntil,speedSelected],
      [mapItem,mapQty,mapRemaining,consumable.treasureMapActiveUntil,mapSelected],
      [areaFreezeItem,areaFreezeQty,0,consumable.areaFreezeArmed?Infinity:0,areaFreezeSelected],
    ]) {
      item.quantity.textContent=String(quantity);
      item.spinner.hidden=left<=0;
      item.detail.textContent=until>now?'Ativo · '+formatTime(Math.ceil((until-now)/1000))
        :left>0?'Recarga · '+formatTime(left):'Pronto para usar';
      item.button.classList.toggle('is-selected',selected);
      item.button.classList.toggle('is-recharging',left>0);
      item.button.title=item.detail.textContent;
    }
    doubleDamageItem.detail.textContent=consumable.doubleDamageEnabled
      ? 'Ativado · 1 carga por disparo · toque para desligar'
      : 'Desativado · toque para ligar';
    doubleDamageItem.button.title=doubleDamageItem.detail.textContent;
    doubleDamageItem.button.classList.toggle('is-selected',doubleSelected||consumable.doubleDamageEnabled);
        const cameraDetached = Boolean(isCameraDetached());
    centerButton.disabled = !cameraDetached&&!isPortrait();
    centerButton.classList.toggle('is-available', cameraDetached);
    centerButton.classList.toggle('is-blocked', !cameraDetached);
    centerButton.setAttribute('aria-disabled', String(!cameraDetached));
    centerButton.title = cameraDetached ? 'Centralizar a câmera no navio' : 'Câmera acompanhando o navio';
    let status = controller.getStatus();
    // Reuse the existing 160ms HUD cadence, not a new animation loop.
    if(isPortrait()&&autoAimEnabled&&status.ready&&!status.firing){
      if(controller.toggleFire())status=controller.getStatus();
    }
    const choices = [...status.options].filter(item => AMMUNITION.some(ammo => ammo.id === item.id))
      .sort((a,b) => ((NAVAL_AMMO[b.id]?.damagePerShot || 0) * (NAVAL_AMMO[b.id]?.damageFactor || 0))
        - ((NAVAL_AMMO[a.id]?.damagePerShot || 0) * (NAVAL_AMMO[a.id]?.damageFactor || 0)));
    const selectedAmmo = AMMUNITION.find(item => item.id === status.ammoId);
    if (selectedAmmo) ammoIcon.src = getAmmunitionAssetUrl(selectedAmmo);
    setText(ammoCount,isPortrait()?'×'+Number(status.ammo||0).toLocaleString('pt-BR'):String(status.ammo??0));
    ammoButton.title = selectedAmmo?.name || 'Selecionar munição';
    const ammoAvailable=choices.some(item=>item.amount>0);
    ammoButton.disabled=!ammoAvailable&&!isPortrait();
    ammoButton.setAttribute('aria-disabled',String(!ammoAvailable));
    ammoButton.classList.toggle('is-blocked',!ammoAvailable);
    const fingerprint = choices.map(item => item.id + ':' + item.amount + ':' + status.ammoId).join('|');
    if (fingerprint !== optionFingerprint) {
      optionFingerprint = fingerprint;
      ammoPicker.replaceChildren(...choices.map(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'naval-ammo-option';
        button.disabled = item.amount <= 0;
        button.classList.toggle('is-selected', item.id === status.ammoId);
        const catalog = AMMUNITION.find(ammo => ammo.id === item.id);
        const img = document.createElement('img');
        img.src = getAmmunitionAssetUrl(catalog);
        img.alt = '';
        const label = document.createElement('span');
        label.textContent = item.name;
        const count = document.createElement('span');
        count.className = 'naval-ammo-option-count';
        count.textContent = String(item.amount);
        button.append(img, label, count);
        button.addEventListener('click', () => {
          setFeedback(controller.setAmmo(item.id) ? 'Munição selecionada.' : 'Munição indisponível.');
          ammoPicker.hidden = true;
          refresh();
        });
        return button;
      }));
    }
    const monsterSelected=controller.getTarget()?.type==='monster';
    const rawAmmo=status.harpoonFiring||monsterSelected?status.harpoonAmmo:status.ammo;
    const abbreviated=Number(rawAmmo)>=1000000
      ?(Number(rawAmmo)/1000000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi'
      :Number(rawAmmo)>=10000
        ?(Number(rawAmmo)/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil'
        :Number(rawAmmo||0).toLocaleString('pt-BR');
    const ammoLong=status.harpoonFiring||monsterSelected
      ? '⚓ '+status.harpoonName+' equipado · '+Number(rawAmmo||0).toLocaleString('pt-BR')+' arpões'
      : '⚫ '+Number(rawAmmo||0).toLocaleString('pt-BR')+' munições';
    setText(ammoQuantity,isPortrait()?'◉ '+abbreviated:ammoLong);
    ammoQuantity.title=ammoLong;
    ammoButton.title=ammoLong+' · Selecione o tipo';
    ammoQuantity.title=monsterSelected?'Lançador de arpão ativo: '+status.harpoonName+' · '+ammoLong:ammoLong;
    const equipped = Number(status.equippedCannons);
    const inRange = Number(status.cannonsInRange);
    const cannonText=Number.isFinite(equipped)&&Number.isFinite(inRange)
      ? 'Canhões: '+equipped+' equipados, '+inRange+' no alcance'
      : 'Contagem de canhões indisponível.';
    if(isPortrait()&&Number.isFinite(equipped)&&Number.isFinite(inRange)){
      const fp=equipped+':'+inRange;
      if(cannonFingerprint!==fp){
        cannonFingerprint=fp;
        cannonQuantity.replaceChildren();
        if(equipped<=18){
          for(let i=0;i<equipped;i++){
            const dot=document.createElement('span');dot.className='portrait-cannon-dot';
            dot.classList.toggle('is-in-range',i<inRange);
            dot.setAttribute('aria-hidden','true');cannonQuantity.append(dot);
          }
        }else setText(cannonQuantity,inRange+'/'+equipped);
      }
      cannonQuantity.setAttribute('aria-label',cannonText);
      cannonQuantity.setAttribute('role','img');
    }else{
      cannonFingerprint='';
      cannonQuantity.removeAttribute('role');cannonQuantity.removeAttribute('aria-label');
      setText(cannonQuantity,'💣 '+cannonText);
    }
    const repairingUntil = Number(controller.readSave?.().combat?.repairingUntil) || 0;
    const recovering = repairingUntil > Date.now();
    const health=Math.round(status.health),maxHealth=controller.getMaxHealth();
    setText(hull,'❤️ Casco: '+health.toLocaleString('pt-BR')+'/'+maxHealth.toLocaleString('pt-BR')+(recovering?' · curando':''));
    setText(statusSummary,'♥ '+health.toLocaleString('pt-BR')+'/'+maxHealth.toLocaleString('pt-BR')
      +' · ◉ '+abbreviated);
    statusTrack.title='Casco '+health.toLocaleString('pt-BR')+' de '+maxHealth.toLocaleString('pt-BR');
    const hullPercentage=Math.max(0,Math.min(100,maxHealth?100*health/maxHealth:0));
    const hullWidth=hullPercentage.toFixed(1)+'%';
    if(statusFill.style.width!==hullWidth)statusFill.style.width=hullWidth;
    const repairAvailable = status.health < controller.getMaxHealth() && !recovering;
    repairButton.disabled = !repairAvailable&&!isPortrait();
    repairIcon.src = repairAvailable ? repairEnabledUrl : repairBlockedUrl;
    repairButton.classList.toggle('is-available', repairAvailable);
    repairButton.classList.toggle('is-blocked', !repairAvailable);
    repairButton.setAttribute('aria-disabled', String(repairButton.disabled));
    repairButton.title = recovering ? 'Recuperação em andamento (10 segundos)' : status.health >= controller.getMaxHealth()
      ? 'Navio com vida completa'
      : 'Reparar casco com continha (+20 PV por acerto)';
    // A imagem indica exatamente o estado retornado pelo controlador de batalha.
    const iconUrl = status.firing ? cancelAttackUrl : startFireUrl;
    // Real controller timers: multi-cannon cadence, slot reload or harpoon reload.
    // This visual is read-only; no new cooldown is introduced.
    const reload=controller.getPlayerReloadState?.()??{remainingMs:0,durationMs:0};
    const progress=reload.durationMs>0?Math.max(0,Math.min(1,reload.remainingMs/reload.durationMs)):0;
    const ring=Math.round(progress*100)+'%';
    if(fireRing.style.getPropertyValue('--reload-left')!==ring)
      fireRing.style.setProperty('--reload-left',ring);
    fireIconButton.classList.toggle('is-reloading',status.firing&&reload.remainingMs>0);
    if (fireIcon.src !== iconUrl) fireIcon.src = iconUrl;
    // Keep the attack control clickable so unavailable attacks explain the cause.
    fireIconButton.disabled = false;
    fireIconButton.classList.toggle('is-firing', status.firing);
    fireIconButton.classList.toggle('is-unavailable', !status.ready && !status.firing);
    fireIconButton.setAttribute('aria-label', status.firing ? 'Cancelar ataque' : 'Disparar');
    fireIconButton.title = status.firing ? 'Cancelar ataque' : status.ready
      ? 'Iniciar disparos' : (MESSAGES[status.reason] || '');
    fireButton.textContent = status.firing ? '⏹ Parar disparos' : '💥 Atirar';
    fireButton.disabled = !status.ready && !status.firing;
    fireButton.classList.toggle('is-firing', status.firing);
    fireButton.title = status.ready || status.firing
      ? 'Disparos automáticos com os canhões equipados'
      : (MESSAGES[status.reason] || '');
    if (!status.firing && !status.ready) {
      const nextAutomatic = MESSAGES[status.reason] || '';
      if (!feedback.textContent || feedback.textContent === automaticFeedback) {
        automaticFeedback = nextAutomatic;
        feedback.textContent = nextAutomatic;
      }
    } else if (automaticFeedback && feedback.textContent === automaticFeedback) {
      automaticFeedback = '';
      feedback.textContent = '';
    }
  }

  consumablesButton.addEventListener('click', () => { ammoPicker.hidden = true; picker.hidden = !picker.hidden; refresh(); });
  autoButton.addEventListener('click',()=>{setAutoAim(!autoAimEnabled);refresh();});
  noneOption.addEventListener('click', () => {controller.selectConsumable('none');picker.hidden=true;refresh();});
  function selectAndActivate(id) {
    if (!controller.selectConsumable(id)) return;
    const result=controller.activateConsumable();
    setFeedback(result.reason);
    picker.hidden=true;
    refresh();
  }
  flameOption.addEventListener('click',()=>selectAndActivate('flame-5x'));
  doubleDamageOption.addEventListener('click',()=>selectAndActivate('double-damage'));
  shieldOption.addEventListener('click',()=>selectAndActivate('shield'));
  speedOption.addEventListener('click',()=>selectAndActivate('speed-plus'));
  mapOption.addEventListener('click',()=>selectAndActivate('treasure-map'));
  areaFreezeOption.addEventListener('click',()=>selectAndActivate('area-freeze'));
  // Commit touch fire only on pointerup, not pointerdown: beginning a swipe
  // near the dock must never accidentally toggle a full automatic volley.
  // A joystick held by the other finger remains independent.
  function bindFireControl(button) {
    let lastTouchAt=-Infinity,gesture=null;
    const fire=()=>{
      const status=controller.getStatus();
      if(!status.ready&&!status.firing){
        setFeedback(MESSAGES[status.reason]||'Disparo indisponível.');
        vibrate([20,40,20]);return;
      }
      // Manual cancel also disables AUTO to avoid restarting on the next refresh.
      if(autoAimEnabled&&status.firing)setAutoAim(false);
      if(controller.toggleFire())vibrate(15);
      refresh();
    };
    button.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch'||button.disabled)return;
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
      lastTouchAt=performance.now();
      if(button.setPointerCapture)button.setPointerCapture(event.pointerId);
      event.preventDefault();event.stopPropagation();
    });
    button.addEventListener('pointermove',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.moved=true;
    });
    button.addEventListener('pointerup',event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      const moved=gesture.moved||Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10;
      gesture=null;event.preventDefault();event.stopPropagation();
      if(!moved)fire();
    });
    button.addEventListener('pointercancel',()=>{gesture=null;});
    button.addEventListener('click',event=>{
      if(event.detail!==0&&performance.now()-lastTouchAt<650){event.preventDefault();return;}
      fire();
    });
  }
  bindFireControl(fireIconButton);
  bindFireControl(fireButton);
  let lastCenterTouchAt = -Infinity;
  function centerShip() {
    if (centerButton.disabled) return;
    if(!isCameraDetached()){
      if(isPortrait())setFeedback('A câmera já está acompanhando o navio.');
      return;
    }
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
    if (controller.getHealth() < controller.getMaxHealth()) onRepair();
    else if(isPortrait())setFeedback('Casco já está completo.');
  });
  repairButton.addEventListener('click', event => {
    if (event?.detail !== 0 && performance.now() - lastRepairTouchAt < 650) return;
    if(!repairButton.disabled){
      if(controller.getHealth() < controller.getMaxHealth())onRepair();
      else if(isPortrait())setFeedback('Casco já está completo.');
    }
  });
  ammoButton.addEventListener('click', () => {
    if(ammoButton.getAttribute('aria-disabled')==='true'){
      setFeedback('Sem munição disponível.');vibrate([20,40,20]);return;
    }
    picker.hidden = true;
    ammoPicker.hidden = !ammoPicker.hidden;
    refresh();
  });
  let unsubscribe=null;
  if(layoutMode)unsubscribe=layoutMode.subscribe(()=>{mountLayout();refresh();});
  else mountLayout();
  refresh();
  return {element,refresh,setFeedback,dispose(){
    unsubscribe?.();if(feedbackTimer)clearTimeout(feedbackTimer);
  }};
}
