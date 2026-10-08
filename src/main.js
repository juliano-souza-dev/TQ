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
let worldGeneration = 0;
const GUEST_UID = 'local-guest';
const LOCAL_SESSION_KEY = 'tq:local-session:v1';
let guestMode = false;

function stopWorld() {
  worldGeneration++;
  if (loop) loop.stop();
  loop = null;
  if (oceanRenderer) oceanRenderer.dispose();
  oceanRenderer = null;
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
  const [{ createWorldState }, { OceanRenderer }, { createAnalogJoystick }] = await Promise.all([
    import('./world/WorldState.js'), import('./rendering/OceanRenderer.js'), import('./ui/AnalogJoystick.js'),
  ]);
  if (generation !== worldGeneration) return;
  const world = createWorldState();
  const joystick = createAnalogJoystick();
  root.append(joystick.element);
  let renderer;
  try {
    renderer = new OceanRenderer(canvas);
    oceanRenderer = renderer;
    await renderer.init(world.region.ocean.texture);
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
  let state = setGameStatus(createGameState({ seed: previousSave?.payload?.seed ?? 1 }), GAME_STATUS.RUNNING);
  let oceanTimeMs = 0;
  loop = new GameLoop({
    update: (stepMs) => {
      state = advanceGameState(state, stepMs);
      oceanTimeMs += stepMs;
      const input = joystick.getVector();
      const speed = 80;
      world.camera.x = Math.max(0, Math.min(world.region.width, world.camera.x + input.x * speed * stepMs / 1000));
      world.camera.y = Math.max(0, Math.min(world.region.height, world.camera.y + input.y * speed * stepMs / 1000));
    },
    render: () => renderer.render(world, oceanTimeMs),
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
