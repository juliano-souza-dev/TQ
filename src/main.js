import { beginHullRecovery, advanceHullRecovery } from './combat/HullRepair.js';
import { getCampaignBoard, recordCampaignEvent } from './missions/RegionOneCampaign.js';
import { resolvePedagogicalAction, resolveMissionReward, activateNextRegion } from './gameplay/PedagogicalActions.js';
import { createMathGate } from './ui/MathGate.js';
import { getVisibleTreasures, findTreasureNearPoint } from './treasures/RegionTreasures.js';
import { TreasureRenderer } from './rendering/TreasureRenderer.js';
import { NavalBattleController } from './combat/NavalBattleController.js';
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
let firstVoyageGuide = null;
let worldGeneration = 0;
const GUEST_UID = 'local-guest';
const LOCAL_SESSION_KEY = 'tq:local-session:v1';
let guestMode = false;

function stopWorld() {
  worldGeneration++;
  if (loop) loop.stop();
  loop = null;
  if (oceanRenderer) oceanRenderer.dispose();
  if (halloweenFogRenderer) halloweenFogRenderer.dispose();
  halloweenFogRenderer = null;
  if (halloweenFogCanvas) halloweenFogCanvas.remove();
  halloweenFogCanvas = null;
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
  const world = createWorldState();
  const savedPosition = localSaves.load(currentUser.uid)?.payload?.playerPosition;
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
  // O navio inicial já pertence ao jogador desde o primeiro acesso.
  // Normaliza saves antigos sem excluir equipamentos ou navios conquistados.
  const initialEquipment = readSave().equipment ?? {};
  if (!initialEquipment.ownedShipIds?.includes(STARTER_SHIP.id)) {
    writePatch({ equipment: {
      ...initialEquipment,
      ownedShipIds: [...new Set([...(initialEquipment.ownedShipIds ?? []), STARTER_SHIP.id])],
    } });
  }
  const { ROSE_GOLD_SHIP } = await import('./ships/RoseGoldShip.js');
  const { SHIP_CATALOG } = await import('./ships/ShipRegistry.js');
  const playableShips = [STARTER_SHIP, ROSE_GOLD_SHIP, ...SHIP_CATALOG];
  const savedEquipment = readSave().equipment ?? {};
  const initialShip = playableShips.find(ship => ship.id === savedEquipment.equippedShipId &&
    (ship.id === STARTER_SHIP.id || savedEquipment.ownedShipIds?.includes(ship.id))) ?? STARTER_SHIP;
  let activeShip = initialShip;
  const { spriteCannonMuzzle } = await import('./ships/CannonMuzzleMap.js');
  function recordMissionEvent(event) {
    const patch = recordCampaignEvent(readSave(), event);
    if (!patch) return false;
    writePatch(patch);
    updateMissionHud();
    return true;
  }
  function resolveMathAction(action, cleanAnswer) {
    const result = resolvePedagogicalAction(readSave(), action, action.challenge, cleanAnswer);
    if (!result) return false;
    writePatch(result.patch);
    updateMissionHud();
    navalHud?.refresh();
    navalHud?.setFeedback('🧮 ' + result.message);
    return result.message;
  }
  const mathGate = createMathGate({
    getPedagogy: () => readSave().pedagogy ?? {},
    getRegion: () => getCampaignBoard(readSave()).activeRegion,
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
    const health = Number(readSave().combat?.shipHealth ?? 100);
    if (health >= 100 || readSave().combat?.repairingUntil) return false;
    repairIsForced = forced;
    return mathGate.open({
      kind: 'repair',
      title: forced ? '☠️ Navio afundado! Reparação obrigatória' : '🔧 Consertar o casco',
      description: forced ? 'Você afundou! Acumule 100 PV acertando continhas. Não é possível fechar até completar.' : 'Cada acerto acumula 20 PV. Saia quando quiser para iniciar a restauração em 10 segundos.',
      repeatOnSuccess: true,
      locked: forced,
      getLocked: () => (readSave().combat?.repairPending ?? 0) < 100,
      getContinue: () => {
        const combat = readSave().combat ?? {};
        const required = forced ? 100 : 100 - Number(combat.shipHealth ?? 100);
        return (combat.repairPending ?? 0) < required;
      },
      onClose: () => {
        const patch = beginHullRecovery(readSave());
        if (patch) writePatch(patch);
        navalHud?.refresh();
      },
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
  if (isHalloweenAtmosphereActive(EVENTS)) {
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
        navalHud?.setFeedback('🐙 Kraken derrotado! +' + gold + ' ouro.');
        return;
      }
      if (save.missions?.corsair === 'active' && npc.archetype === 'red-sail-corsair') {
        writePatch({ missions: { ...save.missions, corsair: 'complete' } });
        updateMissionHud();
        navalHud?.setFeedback('🏆 ' + npc.name + ' afundado! Agora explore as missões livremente.');
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
  clickNavigation = createClickNavigation(canvas, world, point => {
    const npc = findNpcAtPoint(world.entities, point.x, point.y);
    if (npc) {
      selectedNpcId = npc.id;
      navalBattle.setTarget(npc.id, { manual: true });
      navalHud.setFeedback('🎯 Alvo selecionado: ' + npc.name);
      navalHud.refresh();
      return true;
    }
    const treasure = findTreasureNearPoint(getVisibleTreasures(readSave()), point.x, point.y);
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
    getTreasures: () => getVisibleTreasures(readSave()),
    hasTreasureSense: () => Boolean(world.treasureSenseActive),
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
  const updateMissionHud = () => {
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
      getBoard: () => getCampaignBoard(readSave()),
      getPedagogy: () => readSave().pedagogy ?? {},
      onAccept: id => mathGate.open({
        kind: 'accept-mission', id,
        title: '📜 Aceitar contrato',
        description: 'Resolva uma continha para receber sua próxima missão.',
        afterSuccess: () => { islandPanel.refreshMissionBoard(); navalHud.refresh(); },
      }),
      onClaim: id => {
        const result = resolveMissionReward(readSave(), id);
        if (!result) return false;
        writePatch(result.patch);
        navalHud.refresh();
        updateMissionHud();
        if (result.region2Unlocked) navalHud.setFeedback('🎉 Etapa 2 desbloqueada! Agora visite o quadro de missões.');
        else navalHud.setFeedback('🎁 Recompensa recebida: ' + result.mission.name);
        return true;
      },
      onPracticeAnswer: (challenge, firstTry) => {
        const result = resolvePedagogicalAction(readSave(), { kind:'practice' }, challenge, firstTry);
        if (!result) return false;
        writePatch(result.patch);
        updateMissionHud();
        return true;
      },
      onStartRegion2: () => {
        const patch = activateNextRegion(readSave());
        if (!patch) return false;
        writePatch(patch);
        updateMissionHud();
        return true;
      },
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
        if (ship.id === activeShip.id) return true;
        const previous = activeShip;
        try {
          shipRenderer.definition = ship;
          await shipRenderer.init();
          activeShip = ship;
          navalBattle.shipId = ship.id;
          navalBattle.firing = false;
          shipSpeed = getShipSpeed(ship);
          writePatch({ equipment: { ...save.equipment, equippedShipId: ship.id } });
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
  function checkDockContact(fromX, fromY, inputX, inputY, stepMs) {
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
      recordMissionEvent({ type: 'visit', island: contact.kind });
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
  if (npcRenderer.hasShipSprite('fragata-sombra-fugitiva')) {
    createFugitiveFrigatePopulation(world);
  }
  const previousSave = localSaves.load(currentUser.uid);
  const flow = getMissionFlow(previousSave?.payload ?? {}, STARTER_SHIP.id);
  if (flow.destination) {
    const { createFirstVoyageGuide } = await import('./ui/FirstVoyageGuide.js');
    if (generation !== worldGeneration) return;
    firstVoyageGuide = createFirstVoyageGuide(world);
    root.append(...firstVoyageGuide.elements);
    if (flow.stage !== 'welcome') firstVoyageGuide.guideTo(flow.destination);
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
      updateCorsairPopulation(world, stepMs);
      updateNegotiationFrigate(world, readSave());
      updateFugitiveFrigatePopulation(world, stepMs);
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
            navalHud.setFeedback('🎃 Brilho coletado! +'+result.rewards.simple+' ferro · +'+result.rewards.special+' Halloween · +'+result.rewards.gold+' ouro');
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
        const near = findTreasureNearPoint(getVisibleTreasures(readSave()), world.camera.x, world.camera.y, 125);
        treasurePrompt.hidden = !near || mathGate.isOpen || islandPanel.isOpen;
      }
      persistPlayerPosition(stepMs);
      firstVoyageGuide?.update();
      if (sunk || (recovering && repairIsForced)) {
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
        advanceNavigation(world, input, stepMs, shipSpeed);
        trackVoyage(fromX, fromY);
        persistPlayerPosition(stepMs);
        checkDockContact(fromX, fromY, input.x, input.y, stepMs);
      } else {
        const destination = clickNavigation.getDestination();
        if (destination) {
          const fromX = world.camera.x, fromY = world.camera.y;
          const dx = destination.x - fromX, dy = destination.y - fromY;
          const distance = Math.hypot(dx, dy);
          const result = advanceTowardDestination(world, destination, stepMs, shipSpeed);
          trackVoyage(fromX, fromY);
          persistPlayerPosition(stepMs);
          if (distance > 0) checkDockContact(fromX, fromY, dx / distance, dy / distance, stepMs);
          if (result.heading !== null) heading = result.heading;
          if (result.arrived) clickNavigation.cancel();
        } else {
          // Desaceleração por inércia da cinemática do projeto anterior.
          advanceNavigation(world, { x: 0, y: 0 }, stepMs, shipSpeed);
        }
      }
      renderer.updatePlayerWake({x:world.camera.x,y:world.camera.y,heading},stepMs,oceanTimeMs);
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
    },
    render: () => {
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
      renderer.render(world, oceanTimeMs);
      halloweenFogRenderer?.render(world.cameraView, world.camera.zoom, oceanTimeMs);
      islandRenderer.render(world.cameraView, world.camera.zoom);
      treasureRenderer.render(getVisibleTreasures(readSave()),world.cameraView,world.camera.zoom,oceanTimeMs);
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
  localSaves.save(currentUser.uid, { ...previousSave?.payload, seed: state.seed, regionId: world.region.id, profile: { level: previousSave?.payload?.profile?.level ?? 1, gold: previousSave?.payload?.profile?.gold ?? 10 } });
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
