import { campaignFor, boardFor, missionReady } from './missions/CampaignEngine.js';
import { getR2Board,acceptR2Mission,recordR2Event,claimR2Mission } from './missions/RegionTwoCampaign.js';
import { beginHullRecovery, advanceHullRecovery } from './combat/HullRepair.js';
import { getCampaignBoard, recordCampaignEvent } from './missions/RegionOneCampaign.js';
import { resolvePedagogicalAction, resolveMissionReward, activateNextRegion } from './gameplay/PedagogicalActions.js';
import { createMathGate } from './ui/MathGate.js';
import { getVisibleTreasures, findTreasureNearPoint } from './treasures/RegionTreasures.js';
import { TreasureRenderer } from './rendering/TreasureRenderer.js';
import { NavalBattleController } from './combat/NavalBattleController.js';
import { effectiveAmmo } from './combat/NavalBattleRules.js';
import { NavalCombatWebGLRenderer } from './rendering/NavalCombatWebGLRenderer.mjs';
import { createNavalCombatHud } from './ui/NavalCombatHud.js';
import { SEA_GLINTS, collectSeaGlint } from './events/HalloweenSeaGlints.js';
import { EVENTS } from './items/EquipmentCatalog.js';
import { isHalloweenAtmosphereActive } from './events/HalloweenAtmosphere.js';
import { HalloweenFogRenderer } from './rendering/HalloweenFogRenderer.js';
import { getMissionFlow } from './missions/MissionFlow.js';
import { recordLearningAnswer } from './education/LearningProgress.js';
import { GameLoop } from './core/GameLoop.js';
import { createGameState, setGameStatus, GAME_STATUS, advanceGameState } from './core/GameState.js';
import { renderLogin, renderLoading, renderConfigurationRequired } from './ui/Portal.js';
import { createSyncPreferenceStore, SYNC_MODE } from './persistence/SyncPreference.js';
import { createLocalSaveStore } from './persistence/LocalSaveStore.js';

const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app ausente');

const syncPreferences = createSyncPreferenceStore(window.localStorage);
const localSaves = createLocalSaveStore(window.localStorage);
let authService = null;
let currentUser = null;
let loop = null;
let oceanRenderer = null;
let halloweenFogRenderer = null;
let halloweenFogCanvas = null;
let cloudCanvas = null;
let cloudRenderer = null;
let shipCanvas = null;
let islandCanvas = null;
let npcCanvas = null;
let treasureCanvas = null;
let navalCanvas = null;
let navalBattle = null;
let minimapElement = null;
let islandPanelElement = null;
let clickNavigation = null;
let keyboardCamera = null;
let fireKeyCleanup = null;
let firstVoyageGuide = null;
let worldGeneration = 0;
const GUEST_UID = 'local-guest';
const LOCAL_SESSION_KEY = 'tq:local-session:v1';
let guestMode = false;

function stopWorld() {
  worldGeneration++;
  fireKeyCleanup?.();
  fireKeyCleanup = null;
  if (loop) loop.stop();
  loop = null;
  if (oceanRenderer) oceanRenderer.dispose();
  if (halloweenFogRenderer) halloweenFogRenderer.dispose();
  halloweenFogRenderer = null;
  if (halloweenFogCanvas) halloweenFogCanvas.remove();
  halloweenFogCanvas = null;
  cloudRenderer?.dispose();
  cloudRenderer = null;
  cloudCanvas?.remove();
  cloudCanvas = null;
  if (navalBattle) navalBattle.dispose();
  navalBattle = null;
  if (navalCanvas) navalCanvas.remove();
  navalCanvas = null;
  oceanRenderer = null;
  if (keyboardCamera) keyboardCamera.dispose();
  if (firstVoyageGuide) firstVoyageGuide.dispose();
  firstVoyageGuide = null;
  keyboardCamera = null;
  if (clickNavigation) clickNavigation.dispose();
  clickNavigation = null;
  if (islandPanelElement) islandPanelElement.remove();
  islandPanelElement = null;
  if (minimapElement) minimapElement.remove();
  minimapElement = null;
  if (npcCanvas) npcCanvas.remove();
  npcCanvas = null;
  if (treasureCanvas) treasureCanvas.remove();
  treasureCanvas = null;
  if (islandCanvas) islandCanvas.remove();
  islandCanvas = null;
  if (shipCanvas) shipCanvas.remove();
  shipCanvas = null;
}

function enterLocalMode() {
  stopWorld();
  guestMode = true;
  currentUser = { uid: GUEST_UID, displayName: 'Marujo local', isGuest: true };
  syncPreferences.set(GUEST_UID, SYNC_MODE.LOCAL);
  localStorage.setItem(LOCAL_SESSION_KEY, GUEST_UID);
  startWorld();
}

async function startWorld() {
  if (!currentUser) return;
  stopWorld();
  const generation = worldGeneration;
  const canvas = document.createElement('canvas');
  canvas.id = 'ocean';
  canvas.setAttribute('aria-label', 'Oceano da Região 1');
  root.replaceChildren(canvas);
  const [{ createWorldState }, { OceanRenderer }, { createAnalogJoystick }, { ShipRenderer }, { IslandRenderer }, { advanceNavigation, advanceTowardDestination }, { createClickNavigation }, { createKeyboardCameraInput }, { updateCamera }, { createMinimap }, { createIslandPanel }, { getIslandContact }, { getShipSpeed }, { STARTER_SHIP }, { NpcRenderer }, { createCorsairPopulation, updateCorsairPopulation }, { findNpcAtPoint }] = await Promise.all([
    import('./world/WorldState.js'), import('./rendering/OceanRenderer.js'),
    import('./ui/AnalogJoystick.js'), import('./rendering/ShipRenderer.js'),
    import('./rendering/IslandRenderer.js'),
    import('./world/NavigationSystem.js'), import('./world/ClickNavigationInput.js'),
    import('./ui/KeyboardCameraInput.js'), import('./world/CameraSystem.js'),
    import('./ui/Minimap.js'), import('./ui/IslandPanel.js'),
    import('./world/IslandCollision.js'), import('./ships/ShipSpeed.js'),
    import('./ships/ShipRegistry.js'),
    import('./rendering/NpcRenderer.js'), import('./npcs/CorsairPopulation.js'),
    import('./npcs/NpcSelection.js'),
  ]);
  if (generation !== worldGeneration) return;
  const storedRegion = localSaves.load(currentUser.uid)?.payload?.progression?.activeRegion ?? 1;
  const region = storedRegion >= 2
    ? (await import('./world/regions/r2.js')).R2
    : (await import('./world/regions/r1.js')).R1;
  if (generation !== worldGeneration) return;
  const world = createWorldState(region);
  const savedPosition = localSaves.load(currentUser.uid)?.payload?.playerPosition;
  // Migração dos pontos antigos de entrada da R2: próximos demais ao porto.
  // Não alterar posições conquistadas pelo jogador dentro da região.
  if (world.region.id === 'r2' && savedPosition &&
      (Math.hypot(savedPosition.x - 180, savedPosition.y - 1100) < 5 ||
       Math.hypot(savedPosition.x - 650, savedPosition.y - 1020) < 5 ||
       Math.hypot(savedPosition.x - 650, savedPosition.y - 950) < 5)) {
    savedPosition.x = world.region.spawn.x;
    savedPosition.y = world.region.spawn.y;
  }
  if (savedPosition && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
    const { collidesWithIsland } = await import('./world/IslandCollision.js');
    if (savedPosition.x >= 0 && savedPosition.x <= world.region.width && savedPosition.y >= 0 && savedPosition.y <= world.region.height && !collidesWithIsland(world.region, savedPosition.x, savedPosition.y, 32)) {
      world.camera.x = savedPosition.x;
      world.camera.y = savedPosition.y;
    }
  }
  createCorsairPopulation(world);
  const { createFugitiveFrigatePopulation, updateFugitiveFrigatePopulation, updateNegotiationFrigate, NEGOTIATION_APPROACH_RADIUS } =
    await import('./npcs/FugitiveFrigateNpc.js');
  const { createMonsterPopulation, updateMonsterPopulation, monsterGoldReward } = await import('./monsters/MonsterPopulation.js');
  createMonsterPopulation(world);
  updateCamera(world, canvas.clientWidth, canvas.clientHeight);
  let selectedNpcId = null;
  let heading = 0;
  let glintElapsed = 0;
  let hudRefreshElapsed = 0;
  const readSave = () => localSaves.load(currentUser.uid)?.payload ?? {};
  const writePatch = patch => localSaves.save(currentUser.uid, { ...readSave(), ...patch });
  // Grant Veloz+ only once per player, never reset inventory on reload.
  {
    const save=readSave(),c=save.consumables??{};
    if(!c.starterSpeedGranted){
      writePatch({consumables:{...c,starterSpeedGranted:true,
        quantities:{...(c.quantities??{}),
          'speed-plus':(Number(c.quantities?.['speed-plus'])||0)+10}}});
    }
  }
  // One initial treasure map, granted only once per player.
  {
    const save=readSave(),c=save.consumables??{};
    if(!c.starterTreasureMapGranted)writePatch({consumables:{...c,starterTreasureMapGranted:true,
      quantities:{...(c.quantities??{}),'treasure-map':(Number(c.quantities?.['treasure-map'])||0)+1}}});
  }
  // One-time reward migration for missions claimed before treasure maps existed.
  {
    const save=readSave(),c=save.consumables??{},claimed=save.campaign?.claimed??[];
    const grants=['r1-treasure-i','r1-finale'].filter(id=>claimed.includes(id)
      && !save.rewardMigrations?.['treasureMap-'+id]);
    if(grants.length)writePatch({consumables:{...c,quantities:{...(c.quantities??{}),
      'treasure-map':(Number(c.quantities?.['treasure-map'])||0)+grants.length*2}},
      rewardMigrations:{...(save.rewardMigrations??{}),
        ...Object.fromEntries(grants.map(id=>['treasureMap-'+id,true]))}});
  }
  // Migração idempotente: jogadores que já resgataram a missão 10
  // recebem o Aetherion no lugar da recompensa antiga e 5000 orbes.
  {
    const save = readSave();
    const claimed = save.r2Campaign?.claimed?.includes('r2-equip-chaser');
    const migrationKey = 'aetherionRewardV2';
    if (claimed && !save.rewardMigrations?.[migrationKey]) {
      const equipment = save.equipment ?? {};
      const counts = {...(equipment.cannonCounts ?? {})};
      const oldReward = Math.min(1, Number(counts['royal-lion']) || 0);
      if (oldReward) counts['royal-lion'] -= oldReward;
      counts['aetherion-mk1'] = (Number(counts['aetherion-mk1']) || 0) + 1;
      const ownedCannonIds = [...new Set([...(equipment.ownedCannonIds ?? []), 'aetherion-mk1'])]
        .filter(id => id !== 'royal-lion' || counts['royal-lion'] > 0);
      const loadout = Object.fromEntries(Object.entries(equipment.loadout ?? {})
        .map(([ship,slots]) => [ship, Array.isArray(slots)
          ? slots.map(id => id === 'royal-lion' && oldReward ? 'aetherion-mk1' : id)
          : slots]));
      writePatch({
        equipment:{...equipment,cannonCounts:counts,ownedCannonIds,loadout},
        ammunition:{...(save.ammunition ?? {}),'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker']) || 0) + 5000},
        rewardMigrations:{...(save.rewardMigrations ?? {}),[migrationKey]:true},
      });
    }
  }
  // Upgrade previously claimed mission-10 rewards exactly once.
  {
    const save=readSave(),claimed=save.r2Campaign?.claimed?.includes('r2-equip-chaser');
    if(claimed&&!save.rewardMigrations?.aetherionRewardV3){
      const e=save.equipment??{},counts={...(e.cannonCounts??{})};
      counts['aetherion-mk1']=(Number(counts['aetherion-mk1'])||0)+1;
      const c=save.consumables??{},q=c.quantities??{};
      writePatch({
        equipment:{...e,cannonCounts:counts,ownedCannonIds:[...new Set([...(e.ownedCannonIds??[]),'aetherion-mk1'])]},
        ammunition:{...(save.ammunition??{}),'aetherion-seeker':(Number(save.ammunition?.['aetherion-seeker'])||0)+10000},
        consumables:{...c,quantities:{...q,'flame-5x':(Number(q['flame-5x'])||0)+10,
          shield:(Number(q.shield)||0)+10,'speed-plus':(Number(q['speed-plus'])||0)+10}},
        rewardMigrations:{...(save.rewardMigrations??{}),aetherionRewardV3:true},
      });
    }
  }
  // O navio inicial já pertence ao jogador desde o primeiro acesso.
  // Normaliza saves antigos sem excluir equipamentos ou navios conquistados.
  const initialEquipment = readSave().equipment ?? {};
  if (!initialEquipment.ownedShipIds?.includes(STARTER_SHIP.id)
      || !initialEquipment.ownedHarpoonIds?.includes('naval-harpoon-starter')
      || !initialEquipment.equippedHarpoonId) {
    writePatch({ equipment: {
      ...initialEquipment,
      ownedShipIds: [...new Set([...(initialEquipment.ownedShipIds ?? []), STARTER_SHIP.id])],
      ownedHarpoonIds: [...new Set([...(initialEquipment.ownedHarpoonIds ?? []), 'naval-harpoon-starter'])],
      equippedHarpoonId: initialEquipment.equippedHarpoonId || 'naval-harpoon-starter',
    } });
  }
  // Conceder os 500 arpões apenas uma vez. Estoque zero é válido e não é reposto.
  if (readSave().harpoonAmmo?.['harpoon-mariner'] === undefined) {
    writePatch({harpoonAmmo:{...(readSave().harpoonAmmo??{}),'harpoon-mariner':500}});
  }
  const { ROSE_GOLD_SHIP } = await import('./ships/RoseGoldShip.js');
  const { SHIP_CATALOG } = await import('./ships/ShipRegistry.js');
  const playableShips = [STARTER_SHIP, ROSE_GOLD_SHIP, ...SHIP_CATALOG];
  const savedEquipment = readSave().equipment ?? {};
  const initialShip = playableShips.find(ship => ship.id === savedEquipment.equippedShipId &&
    (ship.id === STARTER_SHIP.id || savedEquipment.ownedShipIds?.includes(ship.id))) ?? STARTER_SHIP;
  let activeShip = initialShip;
  // Wide cinematic pursuit framing, local to R2 mission 11.
  const normalCameraZoom = world.camera.zoom;
  let pursuitCameraZoom = normalCameraZoom;
  const pursuitHiddenEntities = new Map();
  function updatePursuitPopulation() {
    const hunting = world.region.id === 'r2' && readSave().r2Campaign?.active === 'r2-destroy-thief';
    if (!hunting) {
      for (const [id, entity] of pursuitHiddenEntities) {
        if (!world.entities.has(id)) world.entities.set(id, entity);
      }
      pursuitHiddenEntities.clear();
      return;
    }
    const corsairs = [...world.entities.values()].filter(n => n.type === 'npc'
      && n.archetype !== 'fugitive-frigate' && n.id !== 'r2-informant');
    // 95% fewer ordinary NPCs; the mission boss and informant stay untouched.
    const keep = new Set(corsairs.slice(0, Math.max(1, Math.ceil(corsairs.length*.05))).map(n => n.id));
    for (const [id, entity] of world.entities) {
      if (entity.type === 'monster' || (entity.type === 'npc'
        && entity.archetype !== 'fugitive-frigate' && id !== 'r2-informant' && !keep.has(id))) {
        pursuitHiddenEntities.set(id, entity);
        world.entities.delete(id);
      }
    }
  }

  function updatePursuitCamera(stepMs = 16) {
    const hunting = world.region.id === 'r2' && readSave().r2Campaign?.active === 'r2-destroy-thief';
    const thief = hunting ? [...world.entities.values()].find(n => n.archetype === 'fugitive-frigate' && n.health > 0) : null;
    const targetZoom = thief ? Math.max(.27, Math.min(.43,
      Math.min(canvas.clientWidth || 900, canvas.clientHeight || 600) /
      Math.max(1300, Math.hypot(world.camera.x-thief.x, world.camera.y-thief.y)*2.4))) * 1.05 * 1.06 : normalCameraZoom;
    const smoothing = 1-Math.exp(-Math.max(0,stepMs)/450);
    pursuitCameraZoom += (targetZoom-pursuitCameraZoom)*smoothing;
    world.camera.zoom = pursuitCameraZoom;
    // Keep player centered unless manual camera control is enabled.
    world.cameraOffset = thief && !world.manualCamera
      ? {x:(thief.x-world.camera.x)*.14,y:(thief.y-world.camera.y)*.14}
      : {x:0,y:-65};
  }

  const { spriteCannonMuzzle } = await import('./ships/CannonMuzzleMap.js');
  // Reward notifications belong to the ocean viewport, not the combat menu.
  const rewardToastLayer=document.createElement('div');
  rewardToastLayer.className='ocean-reward-toast-layer';
  rewardToastLayer.setAttribute('aria-live','polite');
  root.append(rewardToastLayer);
  function showOceanReward(message){
    const toast=document.createElement('div');
    toast.className='ocean-reward-toast';
    toast.textContent=String(message);
    rewardToastLayer.append(toast);
    setTimeout(()=>toast.remove(),3500);
  }
  const missionCompleteOverlay=document.createElement('div');
  missionCompleteOverlay.className='mission-complete-overlay';
  missionCompleteOverlay.hidden=true;
  const missionCompleteCard=document.createElement('section');
  missionCompleteCard.className='mission-complete-card';
  missionCompleteCard.setAttribute('role','dialog');
  missionCompleteCard.setAttribute('aria-modal','true');
  const missionCompleteTitle=document.createElement('h2');
  const missionCompleteText=document.createElement('p');
  const goShipyard=document.createElement('button');
  goShipyard.className='primary-button';goShipyard.type='button';
  goShipyard.textContent='⚓ Voltar ao Estaleiro';
  const keepSailing=document.createElement('button');
  keepSailing.className='secondary-button';keepSailing.type='button';
  keepSailing.textContent='Continuar navegando';
  missionCompleteCard.append(missionCompleteTitle,missionCompleteText,goShipyard,keepSailing);
  missionCompleteOverlay.append(missionCompleteCard);root.append(missionCompleteOverlay);
  keepSailing.addEventListener('click',()=>{missionCompleteOverlay.hidden=true;});
  goShipyard.addEventListener('click',()=>{
    missionCompleteOverlay.hidden=true;
    const island=world.region.islands.find(i=>i.kind==='shipyard');
    if(!island)return;
    // Stop just outside the island artwork, on the side nearest the player.
    const horizontal=Math.abs(world.camera.x-island.x)>Math.abs(world.camera.y-island.y);
    const destination=horizontal
      ?{x:island.x+Math.sign(world.camera.x-island.x||1)*(Number(island.width||820)/2+20),y:island.y}
      :{x:island.x,y:island.y+Math.sign(world.camera.y-island.y||1)*(Number(island.height||690)/2+20)};
    world.manualCamera=null;
    clickNavigation?.setDestination(destination);
    showOceanReward('⚓ Rota para o Estaleiro definida!');
  });
  function announceMissionCompletion(name){
    if(!missionCompleteOverlay.hidden)return;
    missionCompleteTitle.textContent='🏆 Missão concluída!';
    missionCompleteText.textContent=name+' · Objetivo alcançado. Sua recompensa aguarda resgate no Porto das Missões.';
    missionCompleteOverlay.hidden=false;
  }
  function recordMissionEvent(event) {
    const before=boardFor(readSave(),world.region.id);
    const patch = campaignFor(world.region.id).record(readSave(), event);
    if (!patch) return false;
    writePatch(patch);
    updateMissionHud();
    const after=boardFor(readSave(),world.region.id);
    const finished=after.missions.find(m=>m.status==='ready' && before.missions.find(old=>old.id===m.id)?.status!=='ready');
    if(finished){showOceanReward('🏆 Missão concluída: '+finished.name);announceMissionCompletion(finished.name);}
    return true;
  }
  const supplyChest = {x:2035,y:1550};
  const isSupplyChestAvailable = () => world.region.id === 'r2'
    && readSave().r2Campaign?.active === 'r2-destroy-thief'
    && !readSave().consumables?.chaseChestClaimed;
    function resolveMathAction(action, cleanAnswer) {
    if (action.kind === 'chase-supply-chest') {
      if (!isSupplyChestAvailable() || Math.hypot(world.camera.x-supplyChest.x,world.camera.y-supplyChest.y)>170) return false;
      const save=readSave(),c=save.consumables??{},q=c.quantities??{};
      writePatch({consumables:{...c,chaseChestClaimed:true,
        quantities:{...q,'flame-5x':(Number(q['flame-5x'])||0)+10,shield:(Number(q.shield)||0)+10}}});
      navalHud?.refresh();
      showOceanReward('🧰 +10 5X em Chamas · +10 Escudos');
      return 'Baú resgatado: +10 5X em Chamas e +10 Escudos!';
    }
    const result = resolvePedagogicalAction(readSave(), action, action.challenge, cleanAnswer);
    if (!result) return false;
    writePatch(result.patch);
    if (world.region.id === 'r2' && action.kind !== 'monster-assist') {
      const questPatch=campaignFor(world.region.id).record(readSave(),{
        type: action.kind === 'informant' ? 'informant' : 'study',
        id:action.challenge.id+':'+Date.now()
      });
      if(questPatch)writePatch(questPatch);
      if (action.kind === 'informant' && boardFor(readSave(),'r2').missions
        .find(m=>m.id==='r2-informant')?.progress?.[1] >= 3) {
        const save=readSave();
        const until=save.r2Campaign?.informantTruceUntil || Date.now()+30000;
        writePatch({r2Campaign:{...save.r2Campaign,informantTruceUntil:until}});
        const npc=world.entities.get('r2-informant');
        if(npc){npc.name='Corsário das Velas Rubras';npc.informantProtected=false;npc.attackProtectedUntil=until;}
      }
      if(action.kind==='treasure') {
        const treasurePatch=campaignFor(world.region.id).record(readSave(),{type:'treasure',id:action.id});
        if(treasurePatch)writePatch(treasurePatch);
      }
    }
    updateMissionHud();
    navalHud?.refresh();
    if (['treasure','repair','accept-mission'].includes(action.kind))showOceanReward(result.message);
    return result.message;
  }
  const mathGate = createMathGate({
    getPedagogy: () => readSave().pedagogy ?? {},
    getRegion: () => world.region.id === 'r2' ? 2 : 1,
    onSolved: (action, clean) => resolveMathAction(action, clean),
  });
  root.append(mathGate.element);
  let repairIsForced = Number(readSave().combat?.repairingFrom) === 0 && Boolean(readSave().combat?.repairingUntil);
  let repairTickMs = 0;
  const repairAura = document.createElement('div');
  repairAura.className = 'ship-repair-aura';
  repairAura.setAttribute('aria-hidden', 'true');
  repairAura.innerHTML = '<span>+</span><span>+</span><span>+</span><span>+</span><span>+</span>';
  repairAura.hidden = true;
  root.append(repairAura);
  function beginRepairSession(forced = false) {
    const health=Number(readSave().combat?.shipHealth??100);
    if(health>=100||readSave().combat?.repairingUntil)return false;
    repairIsForced=forced;
    return mathGate.open({
      kind:'repair',
      title:forced?'☠️ Navio afundado! Resolva para reparar':'🔧 Consertar o casco',
      description:'Acerte uma multiplicação para iniciar a recuperação automática de 10% da vida total por segundo.',
      repeatOnSuccess:false,
      // A successful answer dismisses the math gate automatically.
      locked:false,
      afterSuccess:()=>navalHud?.refresh(),
    });
  }
  let voyageDistance = 0;
  function trackVoyage(previousX, previousY) {
    voyageDistance += Math.hypot(world.camera.x - previousX, world.camera.y - previousY);
    if (voyageDistance < 30) return;
    const distance = voyageDistance;
    voyageDistance = 0;
    recordMissionEvent({ type: 'travel', amount: distance });
  }


  // The regular ocean, missions and ship renderers are never modified for
  // seasonal cosmetics. Disabling the Halloween event removes this entire layer.
  if (world.region.id === 'r1' && isHalloweenAtmosphereActive(EVENTS)) {
    halloweenFogCanvas = document.createElement('canvas');
    halloweenFogCanvas.className = 'halloween-fog-layer';
    halloweenFogCanvas.setAttribute('aria-hidden', 'true');
    root.append(halloweenFogCanvas);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    halloweenFogRenderer = new HalloweenFogRenderer(halloweenFogCanvas, {
      getReducedMotion: () => reducedMotion?.matches === true,
    });
    if (!halloweenFogRenderer.init()) {
      halloweenFogCanvas.classList.add('halloween-fog-fallback');
    }
  }

  if (world.region.id === 'r2') {
    const { CloudLayerRenderer } = await import('./rendering/CloudLayerRenderer.js');
    if (generation !== worldGeneration) return;
    cloudCanvas = document.createElement('canvas');
    cloudCanvas.className = 'cloud-layer';
    cloudCanvas.setAttribute('aria-hidden', 'true');
    root.append(cloudCanvas);
    cloudRenderer = new CloudLayerRenderer(cloudCanvas);
  }
  const glintCanvas=document.createElement('canvas');
  glintCanvas.className='glint-layer';
  root.append(glintCanvas);
  const glintCtx=glintCanvas.getContext('2d');
  const treasurePrompt = document.createElement('div');
  treasurePrompt.className = 'treasure-nearby-tip';
  treasurePrompt.hidden = true;
  treasurePrompt.textContent = '🧰 Tesouro próximo! Toque na arca para resolver a continha e resgatar.';
  root.append(treasurePrompt);


  navalCanvas = document.createElement('canvas');
  navalCanvas.className = 'naval-combat-webgl';
  navalCanvas.setAttribute('aria-label', 'Animações de batalha naval');
  root.append(navalCanvas);
  const navalRenderer = new NavalCombatWebGLRenderer(navalCanvas);
  navalRenderer.setReducedFx(window.matchMedia?.('(max-width: 700px)').matches === true);

  let navalHud = null;
  navalBattle = new NavalBattleController({
    renderer: navalRenderer,
    shipId: activeShip.id,
    getRegionId: () => world.region.id,
    // Fallback automático no controlador quando não existe mapeamento de boca.
    getMappedMuzzle: ({ player, target, heading, slot }) => spriteCannonMuzzle(
      activeShip, player, target, heading, slot,
      shipRenderer.getFrameWorldSize(world.camera.zoom),
    ),
    readSave,
    writePatch,
    getPlayer: () => ({ x: world.camera.x, y: world.camera.y, heading }),
    getEntities: () => world.entities,
    onFeedback: message => navalHud?.setFeedback(message),
    onVictory: npc => {
      const save = readSave();
      if (npc.type === 'monster') {
        const gold = monsterGoldReward();
        writePatch({ profile: { ...save.profile, gold: (Number(save.profile?.gold) || 0) + gold } });
        recordMissionEvent({
          type: 'defeat', archetype: npc.archetype,
          id: npc.id + ':' + Date.now() + ':' + performance.now(),
        });
        showOceanReward('🐙 Kraken derrotado! +'+gold+' ouro');
        return;
      }
      if (world.region.id === 'r2' && npc.archetype === 'fugitive-frigate'
        && save.r2Campaign?.active === 'r2-destroy-thief') {
        recordMissionEvent({type:'thief',id:npc.id});
        showOceanReward('🏴‍☠️ Ladrão das Sombras afundado!');
      } else if (world.region.id === 'r2' && npc.id === 'r2-admiral') {
        recordMissionEvent({type:'admiral',id:npc.id});
        recordMissionEvent({type:'defeat',id:npc.id+':'+Date.now()});
        showOceanReward('🏴‍☠️ Almirante dos Ladrões derrotado!');
      } else if (world.region.id === 'r1' && save.missions?.corsair === 'active' && npc.archetype === 'red-sail-corsair') {
        writePatch({ missions: { ...save.missions, corsair: 'complete' } });
        updateMissionHud();
        showOceanReward('🏆 '+npc.name+' afundado!');
      } else {
        recordMissionEvent({
          type: 'defeat', archetype: npc.archetype,
          id: npc.id + ':' + Date.now() + ':' + performance.now(),
        });
      }
    },
  });
  navalHud = createNavalCombatHud(navalBattle, {
    onRepair: () => beginRepairSession(false),
    isCameraDetached: () => world.manualCamera !== null && world.manualCamera !== undefined,
    onCenterShip: () => {
      world.manualCamera = null;
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
      return true;
    },
  });
  root.append(navalHud.element);
  // F inicia ou cancela o mesmo ciclo de ataque do HUD.
  // KeyboardEvent.code independe de maiúsculas, Shift e Caps Lock.
  const onFireKey = event => {
    if (event.code !== 'KeyF' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    navalBattle.toggleFire();
    navalHud.refresh();
  };
  document.addEventListener('keydown', onFireKey);
  fireKeyCleanup = () => document.removeEventListener('keydown', onFireKey);
  // A opção contextual não altera os botões existentes do HUD.
  const assistButton=document.createElement('button');
  assistButton.type='button';
  assistButton.className='monster-assist-button primary-button';
  assistButton.textContent='🤝 Receber ajuda';
  assistButton.hidden=true;
  root.append(assistButton);
  assistButton.addEventListener('click',()=>{
    if (!navalBattle.getAssistStatus().eligible || mathGate.isOpen)return;
    mathGate.open({
      kind:'monster-assist',
      title:'🤝 Receber ajuda',
      description:'Resolva uma multiplicação para pedir ajuda ao navegador mais próximo do monstro.',
      afterSuccess:()=>{navalBattle.enableMonsterAssist();assistButton.hidden=true;navalHud.refresh();},
    });
  });

  clickNavigation = createClickNavigation(canvas, world, point => {
    const npc = findNpcAtPoint(world.entities, point.x, point.y);
    if (npc) {
      selectedNpcId = npc.id;
      navalBattle.setTarget(npc.id, { manual: true });
      navalHud.setFeedback('🎯 Alvo selecionado: ' + npc.name);
      navalHud.refresh();
      return true;
    }
    const treasure = findTreasureNearPoint((world.region.id === 'r2' && readSave().r2Campaign?.active === 'r2-destroy-thief') ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id), point.x, point.y);
    if (treasure && Math.hypot(world.camera.x - treasure.x, world.camera.y - treasure.y) < 125) {
      mathGate.open({
        kind: 'treasure', id: treasure.id,
        title: '🧰 Desafio do tesouro',
        description: 'A arca só será aberta depois de resolver a continha.',
      });
      return true;
    }
    return false;
  });
  keyboardCamera = createKeyboardCameraInput();
  const joystick = createAnalogJoystick();
  treasureCanvas = document.createElement('canvas');
  treasureCanvas.className = 'treasure-layer';
  islandCanvas = document.createElement('canvas');
  islandCanvas.className = 'island-layer';
  npcCanvas = document.createElement('canvas');
  npcCanvas.className = 'npc-layer';
  shipCanvas = document.createElement('canvas');
  shipCanvas.className = 'ship-layer';
  shipCanvas.setAttribute('aria-label', 'Navio do jogador');
  root.append(islandCanvas, treasureCanvas, npcCanvas, shipCanvas, joystick.element);
  const shipRenderer = new ShipRenderer(shipCanvas, initialShip);
  const islandRenderer = new IslandRenderer(islandCanvas, world.region.islands ?? []);
  const treasureRenderer = new TreasureRenderer(treasureCanvas);
  const npcRenderer = new NpcRenderer(npcCanvas);
  const minimap = createMinimap(world, {
    getPlayer: () => ({ x: world.camera.x, y: world.camera.y, heading }),
    getNpcs: () => [...world.entities.values()].filter(entity => entity.type === 'npc'),
    getTreasures: () => (world.region.id === 'r2' && readSave().r2Campaign?.active === 'r2-destroy-thief') ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id),
    hasTreasureSense: () => Boolean(world.treasureSenseActive || navalBattle?.isTreasureMapActive()),
  });
  minimapElement = minimap.element;
  root.append(minimapElement);

  const hasEquippedCannon = save => (save.equipment?.loadout?.[STARTER_SHIP.id] ?? []).some(Boolean);
  function reconcileTutorial() {
    const save = readSave();
    const missions = { ...save.missions };
    let changed = false;
    if (missions.firstMission === 'active' && hasEquippedCannon(save)) {
      missions.firstMission = 'equipped';
      changed = true;
    }
    if (missions.firstMission === 'equipped' && !hasEquippedCannon(save)) {
      missions.firstMission = 'active';
      changed = true;
    }
    if (changed) writePatch({ missions });
    return missions;
  }
  reconcileTutorial();
  const equipment = readSave().equipment ?? {};
  const missionHud = document.createElement('aside');
  missionHud.className = 'mission-progress-hud';
  missionHud.setAttribute('aria-live', 'polite');
  root.append(missionHud);
  const supplyChestEl=document.createElement('div');
  supplyChestEl.className='chase-supply-chest';
  supplyChestEl.innerHTML='<span class="chase-supply-arrow">⬇</span><span class="chase-supply-icon">🧰</span>';
  supplyChestEl.hidden=true;
  supplyChestEl.setAttribute('aria-label','Baú de suprimentos da caçada');
  root.append(supplyChestEl);
  function updateSupplyChestMarker() {
    supplyChestEl.hidden=!isSupplyChestAvailable();
    if(supplyChestEl.hidden)return;
    const x=canvas.clientWidth/2+(supplyChest.x-world.cameraView.x)*world.camera.zoom;
    const y=canvas.clientHeight/2+(supplyChest.y-world.cameraView.y)*world.camera.zoom;
    supplyChestEl.hidden=x<0||y<0||x>canvas.clientWidth||y>canvas.clientHeight;
    supplyChestEl.style.left=x+'px';supplyChestEl.style.top=y+'px';
  }

  const targetHud = document.createElement('aside');
  targetHud.className = 'target-status-hud';
  targetHud.hidden = true;
  targetHud.innerHTML = '<div class="target-status-name"></div><div class="target-status-bar"><div class="target-status-fill"></div></div><div class="target-status-value"></div>';
  root.append(targetHud);
  const criticalHealthOverlay = document.createElement('div');
  criticalHealthOverlay.className = 'critical-health-viewport';
  criticalHealthOverlay.hidden = true;
  criticalHealthOverlay.setAttribute('aria-hidden', 'true');
  root.append(criticalHealthOverlay);
  function refreshTargetAndHealthHud() {
    const npc = navalBattle?.getTarget();
    targetHud.hidden = !npc || npc.health <= 0;
    if (!targetHud.hidden) targetHud.style.top = Math.ceil(missionHud.getBoundingClientRect().bottom + 7) + 'px';
    if (!targetHud.hidden) {
      const max = Math.max(1,Number(npc.maxHealth)||Number(npc.health)||1);
      const hp = Math.max(0,Number(npc.health)||0);
      const ratio = Math.min(100,100*hp/max);
      targetHud.querySelector('.target-status-name').textContent = '🎯 '+(npc.name || 'Alvo');
      targetHud.querySelector('.target-status-fill').style.width = ratio+'%';
      targetHud.querySelector('.target-status-value').textContent = Math.ceil(hp).toLocaleString('pt-BR')+' / '+Math.ceil(max).toLocaleString('pt-BR')+' PV';
    }
    criticalHealthOverlay.hidden = navalBattle.getHealth() >= 30;
  }

  const thiefGuide = document.createElement('div');
  thiefGuide.className = 'thief-guide';
  thiefGuide.hidden = true;
  thiefGuide.setAttribute('aria-label', 'Direção da fragata fugitiva');
  thiefGuide.innerHTML = '<span class="thief-guide-arrow">➤</span><span class="thief-guide-label">Ladrão</span>';
  root.append(thiefGuide);
  const exitDialog = document.createElement('section');
  exitDialog.className = 'region-exit-dialog';
  exitDialog.hidden = true;
  exitDialog.setAttribute('role','dialog');
  exitDialog.setAttribute('aria-modal','true');
  exitDialog.setAttribute('aria-label','Passagem para a Costa dos Corsários');
  const exitCard = document.createElement('div');
  exitCard.className = 'region-exit-card';
  const exitHeading = document.createElement('h2');
  exitHeading.textContent = '🧭 Passagem liberada!';
  const exitDescription = document.createElement('p');
  exitDescription.textContent = 'Você encontrou a passagem para a Costa dos Corsários. Deseja navegar para o próximo mapa?';
  const exitActions = document.createElement('div');
  const exitStay = document.createElement('button');
  exitStay.type = 'button';
  exitStay.className = 'secondary-button';
  exitStay.textContent = 'Permanecer na Enseada';
  const exitTravel = document.createElement('button');
  exitTravel.type = 'button';
  exitTravel.className = 'primary-button';
  exitTravel.textContent = '⚓ Navegar para Costa dos Corsários';
  exitActions.append(exitStay,exitTravel);
  exitCard.append(exitHeading,exitDescription,exitActions);
  exitDialog.append(exitCard);
  root.append(exitDialog);
  const exitBeacon = document.createElement('div');
  exitBeacon.className = 'region-exit-beacon';
  exitBeacon.hidden = true;
  exitBeacon.setAttribute('aria-hidden','true');
  exitBeacon.innerHTML = '<span class="region-exit-beacon-ring">✦</span><span class="region-exit-beacon-label">Costa dos Corsários</span>';
  root.append(exitBeacon);
  function updateExitBeacon() {
    const mission = getCampaignBoard(readSave()).missions.find(item => item.id === 'r1-finale');
    const target = world.region.id === 'r1' && mission && ['active','ready','claimed'].includes(mission.status)
      ? world.region.exitPoint : null;
    if (!target) { exitBeacon.hidden = true; return; }
    const x = canvas.clientWidth / 2 + (target.x - world.cameraView.x) * world.camera.zoom;
    const y = canvas.clientHeight / 2 + (target.y - world.cameraView.y) * world.camera.zoom;
    if (x < -100 || x > canvas.clientWidth+100 || y < -100 || y > canvas.clientHeight+100) {
      exitBeacon.hidden = true;
      return;
    }
    exitBeacon.style.left = x + 'px';
    exitBeacon.style.top = y + 'px';
    exitBeacon.hidden = false;
  }

  let exitDismissed = false;
  exitStay.addEventListener('click',()=>{exitDialog.hidden=true;exitDismissed=true;});
  exitTravel.addEventListener('click',()=>{
    let save = readSave();
    const mission = getCampaignBoard(save).missions.find(m=>m.id==='r1-finale');
    if (mission?.status === 'ready') {
      const claimed = resolveMissionReward(save,'r1-finale');
      if (!claimed) return;
      writePatch(claimed.patch);
      save = readSave();
    }
    const patch = activateNextRegion(save);
    if (!patch) {
      exitDescription.textContent = 'Conclua as missões anteriores para liberar a travessia.';
      return;
    }
    writePatch({ ...patch, playerPosition:{x:420,y:860} });
    exitDialog.hidden=true;
    startWorld();
  });

  function updateThiefGuide() {
    const campaign = readSave().campaign ?? {};
    const thiefActive = campaign.active?.includes('r1-negotiation') && !campaign.negotiationRobbed && !mathGate.isOpen;
    const exitActive = campaign.active?.includes('r1-finale')
      && !(campaign.progress?.['r1-finale']?.[0] >= 1) && !mathGate.isOpen;
    const r2 = world.region.id === 'r2' ? getR2Board(readSave()).active[0] : null;
    const guideTarget = r2?.id === 'r2-destroy-thief'
      ? [...world.entities.values()].find(n => n.archetype === 'fugitive-frigate' && n.health > 0)
      : r2?.id === 'r2-informant' && (r2.progress?.[1] ?? 0)<3 ? world.entities.get('r2-informant')
      : r2?.id === 'r2-island' && !r2.ready && ((r2.progress?.[1] ?? 0) < 3) ? world.region.islands.find(i=>i.id==='r2-scenery-north')
      : r2?.id === 'r2-admiral' && (r2.progress?.[1] ?? 0) < 1 && (world.entities.get('r2-admiral')?.health ?? 0) > 0 ? world.entities.get('r2-admiral')
      : r2?.id === 'r2-equip-chaser' && (r2.progress?.[0] ?? 0) < 1 ? world.region.islands.find(i=>i.kind==='shipyard') : null;
    const target = guideTarget ?? (thiefActive
      ? [...world.entities.values()].find(npc => npc.archetype === 'fugitive-frigate' && npc.health > 0)
      : exitActive ? world.region.exitPoint : null);
    if (!target) { thiefGuide.hidden = true; return; }
    thiefGuide.setAttribute('aria-label', exitActive ? 'Direção da saída para Costa dos Corsários' : 'Direção do ladrão');
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) { thiefGuide.hidden = true; return; }
    const x = width / 2 + (target.x - world.cameraView.x) * world.camera.zoom;
    const y = height / 2 + (target.y - world.cameraView.y) * world.camera.zoom;
    const margin = Math.min(75, Math.max(35, Math.min(width,height)*.12));
    const inView = x > margin && x < width - margin && y > margin && y < height - margin;
    const px = inView ? x : Math.max(margin, Math.min(width - margin, x));
    const py = inView ? Math.max(margin, y - 72) : Math.max(margin, Math.min(height - margin, y));
    thiefGuide.style.left = px + 'px';
    thiefGuide.style.top = py + 'px';
    thiefGuide.style.setProperty('--thief-angle', (inView ? 90 : Math.atan2(y-py, x-px)*180/Math.PI) + 'deg');
    thiefGuide.classList.toggle('is-visible-target', inView);
    thiefGuide.querySelector('.thief-guide-label').textContent =
      (guideTarget ? (r2?.id === 'r2-informant' ? 'Informante' : r2?.id === 'r2-island' ? 'Ilha Esquecida' : r2?.id === 'r2-equip-chaser' ? 'Estaleiro · Equipar Fragata' : r2?.id === 'r2-destroy-thief' ? 'Ladrão das Sombras' : 'Almirante') : exitActive ? 'Costa dos Corsários' : 'Ladrão') + ' · ' + Math.round(Math.hypot(target.x-world.camera.x,target.y-world.camera.y)) + ' m';
    thiefGuide.hidden = false;
  }

  const updateMissionHud = () => {
    if (world.region.id === 'r2') {
      missionHud.hidden = false;
      const mission = boardFor(readSave(),world.region.id).active[0];
      const ready = missionReady(readSave(),world.region.id);
      missionHud.textContent = ready
        ? '🎁 Recompensa aguardando resgate · '+ready.name+' · Vá ao Porto das Missões'
        : mission ? '📜 '+mission.name+' · '+mission.objectives.map((o,i)=>mission.progress[i]+'/'+o.count).join(' · ')
        : !readSave().progression?.r2PortVisited ? '📜 Primeiro objetivo: vá ao Porto das Missões'
        : '📜 Vá ao Porto das Missões para receber seu próximo contrato';
      return;
    }
    const flow = getMissionFlow(readSave(), activeShip.id);
    missionHud.hidden = false;
    missionHud.textContent = flow.stage === 'combat' ? '📜 Afunde 1 Corsário das Velas Rubras · 0/1'
      : flow.stage === 'next' ? '📜 Corsário afundado · 1/1 · Retorne ao porto'
      : '📜 ' + flow.objective;
    if (firstVoyageGuide && flow.destination && flow.stage !== 'welcome') firstVoyageGuide.guideTo(flow.destination);
    else if (firstVoyageGuide && !flow.destination) {
      firstVoyageGuide.finish();
      firstVoyageGuide.dispose();
      firstVoyageGuide = null;
    }
  };
  const islandPanel = createIslandPanel({
    missionBoardOptions: {
      getBoard: () => boardFor(readSave(),world.region.id),
      getPedagogy: () => readSave().pedagogy ?? {},
      onAccept: id => world.region.id === 'r2'
        ? (()=>{const patch=campaignFor(world.region.id).accept(readSave(),id);if(!patch)return false;writePatch(patch);updateMissionHud();return true;})()
        : mathGate.open({
        kind: 'accept-mission', id,
        title: '📜 Aceitar contrato',
        description: 'Resolva uma continha para receber sua próxima missão.',
        afterSuccess: () => { islandPanel.refreshMissionBoard(); navalHud.refresh(); },
      }),
      onClaim: id => {
        const result = campaignFor(world.region.id).claim(readSave(), id);
        if (!result) return false;
        writePatch(result.patch);
        navalHud.refresh();
        updateMissionHud();
        showOceanReward(result.region2Unlocked?'🎉 Região 2 desbloqueada!':'🎁 Recompensa recebida: '+result.mission.name);
        return true;
      },
      onPracticeAnswer: (challenge, firstTry) => {
        const result = resolvePedagogicalAction(readSave(), { kind:'practice' }, challenge, firstTry);
        if (!result) return false;
        writePatch(result.patch);
        updateMissionHud();
        return true;
      },
      // A travessia é feita exclusivamente no ponto de saída do mundo, nunca no quadro.
    },
    getMissionState: () => readSave().missions ?? {},
    getMissionFlow: () => getMissionFlow(readSave(), STARTER_SHIP.id),
    getLearningProgress: () => readSave().learning ?? {},
    onLearningAttempt: (correct, firstAttempt) => {
      const save = readSave();
      writePatch({ learning: recordLearningAnswer(save.learning, correct, firstAttempt) });
    },
    shipyardOptions: {
      ships: playableShips,
      loadout: equipment.loadout ?? {},
      ownedCannonIds: equipment.ownedCannonIds ?? [],
      getEquipment: () => readSave().equipment ?? {},
      equippedShipId: initialShip.id,
      onEquipShip: async shipId => {
        const save = readSave();
        const ship = playableShips.find(item => item.id === shipId);
        if (!ship || (ship.id !== STARTER_SHIP.id && !save.equipment?.ownedShipIds?.includes(shipId))) return false;
        if (ship.id === activeShip.id) {
           if (world.region.id==='r2' && ship.id==='fragata-sombra-cacadora') recordMissionEvent({type:'equip-ship',ship:ship.id});
           return true;
         }
        const previous = activeShip;
        try {
          shipRenderer.definition = ship;
          await shipRenderer.init();
          activeShip = ship;
          navalBattle.shipId = ship.id;
          navalBattle.firing = false;
          shipSpeed = getShipSpeed(ship);
          writePatch({ equipment: { ...save.equipment, equippedShipId: ship.id } });
          navalBattle.selectedAmmoId = navalBattle.resolveSelectedAmmo();
          navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
          recordMissionEvent({ type: 'equip-ship', ship: ship.id });
          navalHud?.refresh();
          updateMissionHud();
          return true;
        } catch (error) {
          console.error('Não foi possível carregar o navio', error);
          shipRenderer.definition = previous;
          await shipRenderer.init().catch(console.error);
          return false;
        }
      },
      onLoadoutChange: loadout => {
        const save = readSave();
        const missions = { ...save.missions };
        if (missions.firstMission === 'active' && (loadout[STARTER_SHIP.id] ?? []).some(Boolean)) {
          missions.firstMission = 'equipped';
          firstVoyageGuide?.guideTo('missions');
        } else if (missions.firstMission === 'equipped' && !(loadout[STARTER_SHIP.id] ?? []).some(Boolean)) {
          missions.firstMission = 'active';
          firstVoyageGuide?.guideTo('shipyard');
        }
        writePatch({ equipment: { ...save.equipment, loadout }, missions });
        navalBattle.selectedAmmoId = navalBattle.resolveSelectedAmmo();
        navalBattle.renderer.prepareAmmo?.(effectiveAmmo(navalBattle.selectedAmmoId));
        navalHud?.refresh();
        const slots = loadout[STARTER_SHIP.id] ?? [];
        if (slots.filter(Boolean).length >= STARTER_SHIP.cannonSlots)
          recordMissionEvent({ type: 'equip' });
        if (slots.includes('royal-lion'))
          recordMissionEvent({ type: 'equip', cannon: 'royal-lion' });
        updateMissionHud();
      },
    },
    onRequestNextMission: (answer, expectedAnswer) => {
      if (Number(answer) !== Number(expectedAnswer)) return false;
      const save = readSave();
      writePatch({ missions: { ...save.missions, firstMission: 'complete', corsair: 'active' } });
      firstVoyageGuide?.finish();
      firstVoyageGuide?.dispose();
      firstVoyageGuide = null;
      updateMissionHud();
      return true;
    },
    isFirstMissionAccepted: () => Boolean(localSaves.load(currentUser.uid)?.payload?.tutorial?.firstMissionAccepted),
    onAcceptFirstMission: () => {
      const save = localSaves.load(currentUser.uid)?.payload ?? {};
      const equipped = hasEquippedCannon(save);
      localSaves.save(currentUser.uid, {
        ...save, tutorial: { ...save.tutorial, firstMissionAccepted: true },
        missions: { ...save.missions, firstMission: equipped ? 'equipped' : 'active' },
      });
      firstVoyageGuide?.guideTo(equipped ? 'missions' : 'shipyard');
      updateMissionHud();
    },
  });
  islandPanelElement = islandPanel.element;
  root.append(islandPanelElement);
  let contactId = null;
  let shipSpeed = getShipSpeed(activeShip);
  function combatMissionBlocksPorts() {
    const save=readSave();
    if(world.region.id==='r2') {
      const active=save.r2Campaign?.active;
      return Boolean(active && [
        'r2-thieves','r2-informant','r2-admiral','r2-shadow-materials',
        'r2-shadow-trials','r2-destroy-thief',
      ].includes(active));
    }
    return false;
  }
  function checkDockContact(fromX, fromY, inputX, inputY, stepMs) {
    if(combatMissionBlocksPorts()) { contactId=null; return; }
    const magnitude = Math.hypot(inputX, inputY);
    const step = shipSpeed * stepMs / 1000;
    const contact = magnitude > 0.01 ? getIslandContact(world.region,
      fromX + inputX / Math.max(1, magnitude) * step,
      fromY + inputY / Math.max(1, magnitude) * step) : null;
    if (!contact) {
      const nearby = getIslandContact(world.region, world.camera.x, world.camera.y, 42);
      if (!nearby) contactId = null;
      return;
    }
    if (contact.kind !== 'decoration' && contactId !== contact.id) {
      contactId = contact.id;
      clickNavigation.cancel();
      islandPanel.open(contact.kind);
      if (world.region.id === 'r2' && contact.kind === 'missions' && !readSave().progression?.r2PortVisited) {
        const save = readSave();
        writePatch({ progression: { ...save.progression, r2PortVisited: true } });
        firstVoyageGuide?.finish();
        firstVoyageGuide?.dispose();
        firstVoyageGuide = null;
      }
      if (world.region.id === 'r1') recordMissionEvent({ type: 'visit', island: contact.kind });
      if (world.region.id === 'r2' && contact.kind==='shipyard' && activeShip.id==='fragata-sombra-cacadora') {
        recordMissionEvent({type:'equip-ship',ship:activeShip.id});
      }
      if (world.region.id === 'r2' && contact.kind==='missions') {
        islandPanel.refreshMissionBoard();
      }

      updateMissionHud();
    }
  }
  let renderer;
  try {
    renderer = new OceanRenderer(canvas);
    oceanRenderer = renderer;
    await Promise.all([renderer.init(world.region.ocean.texture), shipRenderer.init(), islandRenderer.init(), npcRenderer.init()]);
    if (generation !== worldGeneration) { renderer.dispose(); return; }
  } catch (error) {
    if (generation !== worldGeneration) return;
    console.error('Falha ao iniciar oceano WebGL', error);
    stopWorld();
    const message = document.createElement('p');
    message.className = 'error-message';
    message.textContent = 'Não foi possível iniciar o oceano: ' + error.message;
    root.replaceChildren(message);
    return;
  }
  // Só ativa o NPC quando seu sprite estiver realmente carregado.
  // Se o arquivo ainda não foi enviado ao GitHub, o oceano inicia normalmente.
  if (['r1', 'r2'].includes(world.region.id) && npcRenderer.hasShipSprite('fragata-sombra-fugitiva')) {
    createFugitiveFrigatePopulation(world);
  }
  const previousSave = localSaves.load(currentUser.uid);
  const flow = getMissionFlow(previousSave?.payload ?? {}, STARTER_SHIP.id);
  if ((world.region.id === 'r2' && !readSave().progression?.r2PortVisited)
      || (world.region.id === 'r1' && flow.destination)) {
    const { createFirstVoyageGuide } = await import('./ui/FirstVoyageGuide.js');
    if (generation !== worldGeneration) return;
    firstVoyageGuide = createFirstVoyageGuide(world);
    root.append(...firstVoyageGuide.elements);
    if (world.region.id === 'r2') firstVoyageGuide.guideTo('missions');
    else if (flow.stage !== 'welcome') firstVoyageGuide.guideTo(flow.destination);
  }
  updateMissionHud();
  let positionSaveElapsed = 0;
  function persistPlayerPosition(stepMs) {
    positionSaveElapsed += stepMs;
    if (positionSaveElapsed < 1500) return;
    positionSaveElapsed = 0;
    writePatch({ playerPosition: { x: world.camera.x, y: world.camera.y } });
  }
  let state = setGameStatus(createGameState({ seed: previousSave?.payload?.seed ?? 1 }), GAME_STATUS.RUNNING);
  let oceanTimeMs = 0;
  loop = new GameLoop({
    update: (stepMs) => {
      state = advanceGameState(state, stepMs);
      oceanTimeMs += stepMs;
      if (world.region.id === 'r2') {
        const active = boardFor(readSave(),world.region.id).active[0];
        const island = world.region.islands.find(i=>i.id==='r2-scenery-north');
        if (active?.id === 'r2-island' && island &&
            Math.hypot(world.camera.x-island.x,world.camera.y-island.y) <= 650) {
          if ((active.progress?.[0] ?? 0) < 1)
            recordMissionEvent({type:'discover',id:island.id});
          const stage = boardFor(readSave(),'r2').active[0];
          if (stage?.id === 'r2-island' && (stage.progress?.[1] ?? 0) < 3 &&
              !mathGate.isOpen && !islandPanel.isOpen) {
            clickNavigation.cancel();
            navalBattle.firing=false;
            mathGate.open({
              kind:'island-riddle',
              title:'🏝️ O Segredo da Ilha Esquecida',
              description:'Decifre três multiplicações para revelar a passagem escondida.',
              repeatOnSuccess:true,
              getContinue:()=> (boardFor(readSave(),'r2').active[0]?.progress?.[1] ?? 3)<3,
            });
          }
        }
        if (active?.id === 'r2-informant' && !world.entities.has('r2-informant')) {
          const ship=[...world.entities.values()].find(n=>n.archetype==='red-sail-corsair' && n.health>0);
          if (ship) {
            world.entities.delete(ship.id);
            ship.id='r2-informant';ship.name='Corsário Informante';
            ship.x=2500;ship.y=900;ship.health=500;ship.maxHealth=500;
            ship.attackProtectedUntil=readSave().r2Campaign?.informantTruceUntil || Infinity;
            ship.informantProtected = true;
            world.entities.set(ship.id,ship);
          }
        }
        {
          const npc=world.entities.get('r2-informant');
          const completed=boardFor(readSave(),'r2').missions.find(m=>m.id==='r2-informant')?.progress?.[1]>=3;
          const until=readSave().r2Campaign?.informantTruceUntil;
          if (npc && completed) {
            npc.name='Corsário das Velas Rubras';
            npc.informantProtected = false;
            npc.attackProtectedUntil=until || Date.now()+30000;
          }
        }
        if (active?.id === 'r2-informant') {
          const npc=world.entities.get('r2-informant');
          const count=active.progress[1]??0;
          if(npc && count<3 && Math.hypot(world.camera.x-npc.x,world.camera.y-npc.y)<130 && !mathGate.isOpen && !islandPanel.isOpen) {
            clickNavigation.cancel();
            navalBattle.firing=false;
            mathGate.open({
              kind:'informant',title:'🏴‍☠️ O Corsário Informante',
              description:'O capitão só revelará a pista depois de três multiplicações corretas.',
              repeatOnSuccess:true,
              getContinue:()=> (boardFor(readSave(),world.region.id).active[0]?.progress[1]??3)<3,
            });
          }
        }
        if (active?.id === 'r2-admiral' && !world.entities.has('r2-admiral')) {
          const ship=[...world.entities.values()].find(n=>n.archetype==='red-sail-corsair' && n.health>0);
          if (ship) {
            world.entities.delete(ship.id);
            ship.id='r2-admiral';ship.name='Almirante dos Ladrões';
            ship.health=800;ship.maxHealth=800;
            world.entities.set(ship.id,ship);
          }
        }
      }
      updatePursuitPopulation();
      updateCorsairPopulation(world, stepMs);
      updateNegotiationFrigate(world, readSave());
      updateFugitiveFrigatePopulation(world, stepMs);
      if (world.region.id === 'r2') {
        const thiefMission = readSave().r2Campaign?.active === 'r2-destroy-thief';
        for (const npc of world.entities.values()) {
          if (npc.archetype !== 'fugitive-frigate') continue;
          if (thiefMission) {
            // Inicializar uma única vez: nunca repor PV após os disparos.
            if (!npc.thiefBossInitialized) {
              const savedBoss=readSave().r2ThiefBoss;
              const hp=Number(savedBoss?.health);
              npc.maxHealth=100000;
              npc.health=savedBoss?.missionId==='r2-destroy-thief' && Number.isFinite(hp)
                ? Math.max(0,Math.min(100000,hp)) : 100000;
              if (savedBoss?.missionId==='r2-destroy-thief') {
                if(Number.isFinite(Number(savedBoss.x)))npc.x=Number(savedBoss.x);
                if(Number.isFinite(Number(savedBoss.y)))npc.y=Number(savedBoss.y);
                if(Number.isFinite(Number(savedBoss.heading)))npc.heading=Number(savedBoss.heading);
              }
              npc.thiefBossInitialized=true;
              if(npc.health<=0)npc.state='sunk';
            }
            npc.cannonSlots = 1;
            npc.range = 840;
            npc.damage = 3;
            npc.keepAwayFromEdges = true;
          } else {
            npc.keepAwayFromEdges = false;
          }
        }
      }
      updateMonsterPopulation(world, stepMs);
      glintElapsed+=stepMs;
      if(EVENTS.halloween){
        const save=readSave();
        const nearby=SEA_GLINTS.find(g=>!(save.collectedGlints??[]).includes(g.id)&&Math.hypot(g.x-world.camera.x,g.y-world.camera.y)<55);
        if(nearby){
          const result=collectSeaGlint(save,nearby.id);
          if(result){
            writePatch(result.patch);
            recordMissionEvent({ type:'collect', id:nearby.id });
            showOceanReward('🎃 +'+result.rewards.simple+' ferro · +'+result.rewards.special+' Halloween · +'+result.rewards.gold+' ouro');
          }
        }
      }
      const campaign = readSave().campaign ?? {};
      const negotiationActive = campaign.active?.includes('r1-negotiation') && !campaign.negotiationRobbed;
      if (negotiationActive && !mathGate.isOpen && !islandPanel.isOpen) {
        const thief = [...world.entities.values()].find(npc => npc.archetype === 'fugitive-frigate');
        if (thief && Math.hypot(world.camera.x - thief.x, world.camera.y - thief.y) <= NEGOTIATION_APPROACH_RADIUS) {
          clickNavigation.cancel();
          navalBattle.firing = false;
          mathGate.open({
            kind: 'negotiation',
            title: '🏴‍☠️ A Negociação, o Golpe',
            description: 'O capitão exige cinco multiplicações para liberar a passagem. Cada resposta certa aproxima o acordo.',
            repeatOnSuccess: true,
            locked: true,
            getLocked: () => (readSave().campaign?.progress?.['r1-negotiation']?.[0] ?? 0) < 5,
            getContinue: () => (readSave().campaign?.progress?.['r1-negotiation']?.[0] ?? 0) < 5,
            afterSuccess: () => { updateNegotiationFrigate(world, readSave()); updateMissionHud(); navalHud.refresh(); },
            onClose: () => { updateNegotiationFrigate(world, readSave()); updateMissionHud(); navalHud.refresh(); },
          });
        }
      }
      if(isSupplyChestAvailable() && !mathGate.isOpen && !islandPanel.isOpen
          && Math.hypot(world.camera.x-supplyChest.x,world.camera.y-supplyChest.y)<135) {
        clickNavigation.cancel();
        navalBattle.firing=false;
        mathGate.open({kind:'chase-supply-chest',title:'🧰 Baú da Caçada',
          description:'Resolva uma multiplicação para ganhar 10 consumíveis 5X em Chamas e 10 Escudos.'});
      }
            navalBattle.update(stepMs,performance.now());
      repairTickMs += stepMs;
      if (repairTickMs >= 100) {
        repairTickMs = 0;
        const change = advanceHullRecovery(readSave());
        if (change) writePatch(change);
      }
      const repairState = readSave().combat ?? {};
      const recovering = Boolean(repairState.repairingUntil);
      repairAura.hidden = !recovering;
      const sunk = Number(repairState.shipHealth ?? 100) <= 0;
      if (sunk && !recovering && (!mathGate.isOpen || mathGate.activeKind !== 'repair' || !repairIsForced)) {
        clickNavigation.cancel();
        navalBattle.firing = false;
        if (mathGate.isOpen) mathGate.close(true);
        beginRepairSession(true);
      }
      // Marcador visual acompanha a selecao automatica.
      selectedNpcId = navalBattle.targetId;
      hudRefreshElapsed += stepMs;
      if (hudRefreshElapsed >= 160) {
        hudRefreshElapsed = 0;
        navalHud.refresh();
        refreshTargetAndHealthHud();
        assistButton.hidden = !navalBattle.getAssistStatus().eligible || mathGate.isOpen || islandPanel.isOpen;
        const near = findTreasureNearPoint((world.region.id === 'r2' && readSave().r2Campaign?.active === 'r2-destroy-thief') ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id), world.camera.x, world.camera.y, 125);
        treasurePrompt.hidden = !near || mathGate.isOpen || islandPanel.isOpen;
      }
      persistPlayerPosition(stepMs);
      firstVoyageGuide?.update();
      // Only a truly sunk ship that has NOT started regeneration is immobilized.
      // During recovery (including 0 HP immediately after solving), navigation stays enabled.
      if (sunk && !recovering) {
        clickNavigation.cancel();
        renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
        updateCamera(world, canvas.clientWidth, canvas.clientHeight);
        if (!recovering && !sunk) repairIsForced = false;
        return;
      }
      if (!recovering) repairIsForced = false;
      // Manual camera moves only while WASD is held; no inertia or ship movement.
      const cameraInput = keyboardCamera.getVector();
      if (cameraInput.x !== 0 || cameraInput.y !== 0) {
        if (!world.manualCamera) world.manualCamera = { ...world.cameraView };
        const distance = 320 * stepMs / 1000;
        const zoom = Math.max(world.camera.zoom, 0.01);
        const halfW = canvas.clientWidth / (2 * zoom);
        const halfH = canvas.clientHeight / (2 * zoom);
        const clamp = (value, extent, half) => extent <= 2 * half
          ? extent / 2 : Math.max(half, Math.min(extent - half, value));
        world.manualCamera.x = clamp(world.manualCamera.x + cameraInput.x * distance, world.region.width, halfW);
        world.manualCamera.y = clamp(world.manualCamera.y + cameraInput.y * distance, world.region.height, halfH);
      }
      if (islandPanel.isOpen) {
        renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
        updateCamera(world, canvas.clientWidth, canvas.clientHeight);
        return;
      }
      const input = joystick.getVector();
      if (Math.hypot(input.x, input.y) > 0.12) {
        clickNavigation.cancel();
        heading = (Math.atan2(input.x, -input.y) * 180 / Math.PI + 360) % 360;
        const fromX = world.camera.x, fromY = world.camera.y;
        advanceNavigation(world, input, stepMs, shipSpeed*(navalBattle?.isSpeedActive()?1.1:1));
        trackVoyage(fromX, fromY);
        persistPlayerPosition(stepMs);
        checkDockContact(fromX, fromY, input.x, input.y, stepMs);
      } else {
        const destination = clickNavigation.getDestination();
        if (destination) {
          const fromX = world.camera.x, fromY = world.camera.y;
          const dx = destination.x - fromX, dy = destination.y - fromY;
          const distance = Math.hypot(dx, dy);
          const result = advanceTowardDestination(world, destination, stepMs, shipSpeed*(navalBattle?.isSpeedActive()?1.1:1));
          trackVoyage(fromX, fromY);
          persistPlayerPosition(stepMs);
          if (distance > 0) checkDockContact(fromX, fromY, dx / distance, dy / distance, stepMs);
          if (result.heading !== null) heading = result.heading;
          if (result.arrived) clickNavigation.cancel();
        } else {
          // Desaceleração por inércia da cinemática do projeto anterior.
          advanceNavigation(world, { x: 0, y: 0 }, stepMs, shipSpeed*(navalBattle?.isSpeedActive()?1.1:1));
        }
      }
      if (world.region.id === 'r1') {
        const exit = world.region.exitPoint;
        const distanceToExit = exit ? Math.hypot(world.camera.x-exit.x,world.camera.y-exit.y) : Infinity;
        if (distanceToExit > (exit?.radius ?? 0) + 45) exitDismissed = false;
        const board = getCampaignBoard(readSave());
        const finalMission = board.missions.find(m => m.id === 'r1-finale');
        const canUsePassage = finalMission && ['active','ready','claimed'].includes(finalMission.status);
        if (canUsePassage && distanceToExit <= exit.radius) {
          if (finalMission.status === 'active') recordMissionEvent({type:'exit',id:'r1-exit-east'});
          clickNavigation.cancel();
          if (!exitDismissed && exitDialog.hidden && !mathGate.isOpen && !islandPanel.isOpen) {
            exitDialog.hidden = false;
            navalBattle.firing = false;
          }
        }
      }
      if (world.region.id === 'r1' && !exitDialog.hidden) {
        clickNavigation.cancel();
      }
      renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
    },
    render: () => {
      updatePursuitCamera(16);
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
      renderer.render(world, oceanTimeMs);
      halloweenFogRenderer?.render(world.cameraView, world.camera.zoom, oceanTimeMs);
      cloudRenderer?.render(world.cameraView, world.camera.zoom, oceanTimeMs);
      islandRenderer.render(world.cameraView, world.camera.zoom);
      const hidePursuitTreasures = world.region.id === 'r2'
        && readSave().r2Campaign?.active === 'r2-destroy-thief';
      treasureRenderer.render(hidePursuitTreasures ? [] : getVisibleTreasures(readSave(),Date.now(),world.region.id),world.cameraView,world.camera.zoom,oceanTimeMs);
      updateSupplyChestMarker();
      if (selectedNpcId && (world.entities.get(selectedNpcId)?.health ?? 0) <= 0) {
        selectedNpcId = null;
        navalBattle.setTarget(null);
      }
      npcRenderer.render(world.entities, world.cameraView, world.camera.zoom, selectedNpcId, navalRenderer.getKrakenAttacks(), performance.now());
      // Rock the player ship only at the underwater impact, then damp the motion.
      const renderNow = performance.now();
      let krakenImpact = null;
      for (const attack of navalRenderer.getKrakenAttacks()) {
        const elapsed = renderNow - attack.startTime - 970;
        if (elapsed < 0 || elapsed > 620) continue;
        const distance = Math.hypot(world.camera.x - attack.to.x, world.camera.y - attack.to.y);
        if (distance > 65) continue;
        const strength = Math.sin(Math.PI * elapsed / 620) * (1 - elapsed / 620);
        if (!krakenImpact || strength > krakenImpact.strength) {
          krakenImpact = { strength, phase: elapsed / 100 };
        }
      }
      shipRenderer.render(heading, world.camera, world.cameraView, world.camera.zoom, krakenImpact);
      if (!repairAura.hidden) {
        const rect = canvas.getBoundingClientRect();
        const px = rect.left + rect.width / 2 + (world.camera.x - world.cameraView.x) * world.camera.zoom;
        const py = rect.top + rect.height / 2 + (world.camera.y - world.cameraView.y) * world.camera.zoom;
        const sprite = shipRenderer.getFrameWorldSize(world.camera.zoom);
        const auraSize = Math.max(54, Math.min(210, Math.max(sprite.width, sprite.height) * world.camera.zoom * .75));
        repairAura.style.left = px + 'px';
        repairAura.style.top = py + 'px';
        repairAura.style.width = auraSize + 'px';
        repairAura.style.height = auraSize + 'px';
      }
      navalBattle.render(performance.now(),world.cameraView,world.camera.zoom,canvas.clientWidth,canvas.clientHeight);
      minimap.render();
      updateThiefGuide();
      updateExitBeacon();
      const gr=glintCanvas.getBoundingClientRect(),gd=Math.min(window.devicePixelRatio||1,2);
      const gw=Math.max(1,Math.round(gr.width*gd)),gh=Math.max(1,Math.round(gr.height*gd));
      if(glintCanvas.width!==gw||glintCanvas.height!==gh){glintCanvas.width=gw;glintCanvas.height=gh;}
      glintCtx.clearRect(0,0,gw,gh);
      if(EVENTS.halloween){
        const collected=readSave().collectedGlints??[];
        for(const g of SEA_GLINTS){
          if(collected.includes(g.id))continue;
          const x=gw/2+(g.x-world.cameraView.x)*world.camera.zoom*gd;
          const y=gh/2+(g.y-world.cameraView.y)*world.camera.zoom*gd;
          if(x<0||x>gw||y<0||y>gh)continue;
          const pulse=1+0.24*Math.sin(glintElapsed/260+g.x);
          glintCtx.save();glintCtx.translate(x,y);glintCtx.scale(pulse,pulse);
          glintCtx.shadowColor='#ffcf6b';glintCtx.shadowBlur=26*gd;
          glintCtx.fillStyle='#fff2a0';glintCtx.beginPath();glintCtx.arc(0,0,6*gd,0,Math.PI*2);glintCtx.fill();
          glintCtx.strokeStyle='#fff6c7';glintCtx.lineWidth=2*gd;
          glintCtx.beginPath();glintCtx.moveTo(-16*gd,0);glintCtx.lineTo(16*gd,0);glintCtx.moveTo(0,-16*gd);glintCtx.lineTo(0,16*gd);glintCtx.stroke();glintCtx.restore();
        }
      }
    },
  });
  if (!document.hidden) loop.start();
  // This first local save contains only the minimal world metadata.
  // Gameplay state persistence will be extended alongside the systems.
  // Never overwrite mission/combat writes performed during async world startup
  // with an earlier snapshot of the same save.
  const latestSave=readSave();
  localSaves.save(currentUser.uid,{
    ...latestSave,seed:state.seed,regionId:world.region.id,
    profile:latestSave.profile??{level:1,gold:10},
  });
}

function showLogin(error = '') {
  stopWorld();
  renderLogin(root, {
    error,
    onLocal: enterLocalMode,
    onLogin: async () => {
      if (!authService) return;
      renderLogin(root, { busy: true, onLogin: () => {}, onLocal: enterLocalMode });
      try { await authService.signIn(); }
      catch (e) {
        console.error('Falha no login Google', e);
        showLogin('Não foi possível entrar com Google. Tente novamente.');
      }
    },
  });
}

renderLoading(root);
if (localStorage.getItem(LOCAL_SESSION_KEY) === GUEST_UID) {
  enterLocalMode();
} else try {
  // Optional local Firebase config is intentionally not committed.
  const { initializeAuthentication } = await import('./auth/firebase.js');
  authService = initializeAuthentication();
  authService.subscribe(user => {
    if (guestMode) return;
    currentUser = user;
    if (user) startWorld();
    else showLogin();
  });
} catch (error) {
  console.error('Firebase não configurado ou indisponível', error);
  renderLogin(root, { onLocal: enterLocalMode, onLogin: () => renderConfigurationRequired(root, { onLocal: enterLocalMode }) });
}

document.addEventListener('visibilitychange', () => {
  if (!loop) return;
  if (document.hidden) loop.stop();
  else if (currentUser) loop.start();
});
window.addEventListener('pagehide', stopWorld);
