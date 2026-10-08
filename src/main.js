import { NavalBattleController } from './combat/NavalBattleController.js';
import { NavalCombatWebGLRenderer } from './rendering/NavalCombatWebGLRenderer.mjs';
import { createNavalCombatHud } from './ui/NavalCombatHud.js';
import { SEA_GLINTS, collectSeaGlint } from './events/HalloweenSeaGlints.js';
import { EVENTS } from './items/EquipmentCatalog.js';
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
let shipCanvas = null;
let islandCanvas = null;
let npcCanvas = null;
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
  updateCamera(world, canvas.clientWidth, canvas.clientHeight);
  let selectedNpcId = null;
  let heading = 0;
  let glintElapsed = 0;
  let hudRefreshElapsed = 0;
  const readSave = () => localSaves.load(currentUser.uid)?.payload ?? {};
  const writePatch = patch => localSaves.save(currentUser.uid, { ...readSave(), ...patch });

  const glintCanvas=document.createElement('canvas');
  glintCanvas.className='glint-layer';
  root.append(glintCanvas);
  const glintCtx=glintCanvas.getContext('2d');

  navalCanvas = document.createElement('canvas');
  navalCanvas.className = 'naval-combat-webgl';
  navalCanvas.setAttribute('aria-label', 'Animações de batalha naval');
  root.append(navalCanvas);
  const navalRenderer = new NavalCombatWebGLRenderer(navalCanvas);
  navalRenderer.setReducedFx(window.matchMedia?.('(max-width: 700px)').matches === true);

  let navalHud = null;
  navalBattle = new NavalBattleController({
    renderer: navalRenderer,
    shipId: STARTER_SHIP.id,
    readSave,
    writePatch,
    getPlayer: () => ({ x: world.camera.x, y: world.camera.y, heading }),
    getEntities: () => world.entities,
    onFeedback: message => navalHud?.setFeedback(message),
    onVictory: npc => {
      const save = readSave();
      if (save.missions?.corsair === 'active') {
        writePatch({ missions: { ...save.missions, corsair: 'complete' } });
        updateMissionHud();
        navalHud?.setFeedback('🏆 ' + npc.name + ' afundado! Missão concluída.');
      }
    },
  });
  navalHud = createNavalCombatHud(navalBattle);
  root.append(navalHud.element);
  clickNavigation = createClickNavigation(canvas, world, point => {
    const npc = findNpcAtPoint(world.entities, point.x, point.y);
    if (npc) {
      selectedNpcId = npc.id;
      navalBattle.setTarget(npc.id);
      navalHud.setFeedback('🎯 Alvo selecionado: ' + npc.name);
      navalHud.refresh();
    }
    return Boolean(npc);
  });
  keyboardCamera = createKeyboardCameraInput();
  const joystick = createAnalogJoystick();
  islandCanvas = document.createElement('canvas');
  islandCanvas.className = 'island-layer';
  npcCanvas = document.createElement('canvas');
  npcCanvas.className = 'npc-layer';
  shipCanvas = document.createElement('canvas');
  shipCanvas.className = 'ship-layer';
  shipCanvas.setAttribute('aria-label', 'Navio do jogador');
  root.append(islandCanvas, npcCanvas, shipCanvas, joystick.element);
  const shipRenderer = new ShipRenderer(shipCanvas);
  const islandRenderer = new IslandRenderer(islandCanvas, world.region.islands ?? []);
  const npcRenderer = new NpcRenderer(npcCanvas);
  const minimap = createMinimap(world, {
    getPlayer: () => ({ x: world.camera.x, y: world.camera.y, heading }),
    getNpcs: () => [...world.entities.values()].filter(entity => entity.type === 'npc'),
    getTreasures: () => [...world.entities.values()].filter(entity => entity.type === 'treasure'),
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
    const flow = getMissionFlow(readSave(), STARTER_SHIP.id);
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
    getMissionState: () => readSave().missions ?? {},
    getMissionFlow: () => getMissionFlow(readSave(), STARTER_SHIP.id),
    getLearningProgress: () => readSave().learning ?? {},
    onLearningAttempt: (correct, firstAttempt) => {
      const save = readSave();
      writePatch({ learning: recordLearningAnswer(save.learning, correct, firstAttempt) });
    },
    shipyardOptions: {
      loadout: equipment.loadout ?? {},
      ownedCannonIds: equipment.ownedCannonIds ?? [],
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
  const shipSpeed = getShipSpeed(STARTER_SHIP);
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
      glintElapsed+=stepMs;
      if(EVENTS.halloween){
        const save=readSave();
        const nearby=SEA_GLINTS.find(g=>!(save.collectedGlints??[]).includes(g.id)&&Math.hypot(g.x-world.camera.x,g.y-world.camera.y)<55);
        if(nearby){
          const result=collectSeaGlint(save,nearby.id);
          if(result){writePatch(result.patch);navalHud.setFeedback('🎃 Brilho coletado! +'+result.rewards.simple+' ferro · +'+result.rewards.special+' Halloween · +'+result.rewards.gold+' ouro');}
        }
      }
      navalBattle.update(stepMs,performance.now());
      hudRefreshElapsed += stepMs;
      if (hudRefreshElapsed >= 160) {
        hudRefreshElapsed = 0;
        navalHud.refresh();
      }
      persistPlayerPosition(stepMs);
      firstVoyageGuide?.update();
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
      if (islandPanel.isOpen) { updateCamera(world, canvas.clientWidth, canvas.clientHeight); return; }
      const input = joystick.getVector();
      if (Math.hypot(input.x, input.y) > 0.12) {
        clickNavigation.cancel();
        heading = (Math.atan2(input.x, -input.y) * 180 / Math.PI + 360) % 360;
        const fromX = world.camera.x, fromY = world.camera.y;
        advanceNavigation(world, input, stepMs, shipSpeed);
        persistPlayerPosition(stepMs);
        checkDockContact(fromX, fromY, input.x, input.y, stepMs);
      } else {
        const destination = clickNavigation.getDestination();
        if (destination) {
          const fromX = world.camera.x, fromY = world.camera.y;
          const dx = destination.x - fromX, dy = destination.y - fromY;
          const distance = Math.hypot(dx, dy);
          const result = advanceTowardDestination(world, destination, stepMs, shipSpeed);
          persistPlayerPosition(stepMs);
          if (distance > 0) checkDockContact(fromX, fromY, dx / distance, dy / distance, stepMs);
          if (result.heading !== null) heading = result.heading;
          if (result.arrived) clickNavigation.cancel();
        }
      }
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
    },
    render: () => {
      updateCamera(world, canvas.clientWidth, canvas.clientHeight);
      renderer.render(world, oceanTimeMs);
      islandRenderer.render(world.cameraView, world.camera.zoom);
      if (selectedNpcId && (world.entities.get(selectedNpcId)?.health ?? 0) <= 0) {
        selectedNpcId = null;
        navalBattle.setTarget(null);
      }
      npcRenderer.render(world.entities, world.cameraView, world.camera.zoom, selectedNpcId);
      shipRenderer.render(heading, world.camera, world.cameraView, world.camera.zoom);
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
