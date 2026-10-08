import { GameLoop } from './core/GameLoop.js';
import { createGameState, setGameStatus, GAME_STATUS, advanceGameState } from './core/GameState.js';
import { createWorldState } from './world/WorldState.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { renderLogin, renderPortal, renderLoading, renderConfigurationRequired } from './ui/Portal.js';
import { createSyncPreferenceStore, SYNC_MODE } from './persistence/SyncPreference.js';
import { createLocalSaveStore } from './persistence/LocalSaveStore.js';

const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app ausente');

const syncPreferences = createSyncPreferenceStore(window.localStorage);
const localSaves = createLocalSaveStore(window.localStorage);
let authService = null;
let currentUser = null;
let loop = null;
let screenVersion = 0;

function stopWorld() {
  if (loop) loop.stop();
  loop = null;
}

function openPortal() {
  stopWorld();
  if (!currentUser) return;
  const syncMode = syncPreferences.get(currentUser.uid);
  renderPortal(root, currentUser, {
    syncMode,
    onModeChange: mode => {
      if (!currentUser || mode !== SYNC_MODE.LOCAL) return;
      try { syncPreferences.set(currentUser.uid, mode); openPortal(); }
      catch (error) { console.error('Falha ao salvar preferência local', error); }
    },
    onPlay: () => {
      if (!currentUser || syncPreferences.get(currentUser.uid) !== SYNC_MODE.LOCAL) return;
      startWorld();
    },
    onLogout: async () => {
      stopWorld();
      try { await authService.signOut(); }
      catch (error) { console.error('Falha ao sair da conta', error); openPortal(); }
    },
  });
}

function startWorld() {
  if (!currentUser || syncPreferences.get(currentUser.uid) !== SYNC_MODE.LOCAL) return;
  stopWorld();
  const canvas = document.createElement('canvas');
  canvas.id = 'ocean';
  canvas.setAttribute('aria-label', 'Oceano da Região 1');
  root.replaceChildren(canvas);
  const world = createWorldState();
  const renderer = new OceanRenderer(canvas);
  const previousSave = localSaves.load(currentUser.uid);
  let state = setGameStatus(createGameState({ seed: previousSave?.payload?.seed ?? 1 }), GAME_STATUS.RUNNING);
  loop = new GameLoop({
    update: (stepMs) => { state = advanceGameState(state, stepMs); },
    render: () => renderer.render(world),
  });
  if (!document.hidden) loop.start();
  // This first local save contains only the minimal world metadata.
  // Gameplay state persistence will be extended alongside the systems.
  localSaves.save(currentUser.uid, { seed: state.seed, regionId: world.region.id });
}

function showLogin(error = '') {
  stopWorld();
  renderLogin(root, {
    error,
    onLogin: async () => {
      if (!authService) return;
      renderLogin(root, { busy: true, onLogin: () => {} });
      try { await authService.signIn(); }
      catch (e) {
        console.error('Falha no login Google', e);
        showLogin('Não foi possível entrar com Google. Tente novamente.');
      }
    },
  });
}

renderLoading(root);
try {
  // Optional local Firebase config is intentionally not committed.
  const { initializeAuthentication } = await import('./auth/firebase.js');
  authService = initializeAuthentication();
  authService.subscribe(user => {
    screenVersion++;
    currentUser = user;
    if (user) openPortal();
    else showLogin();
  });
} catch (error) {
  console.error('Firebase não configurado ou indisponível', error);
  renderConfigurationRequired(root);
}

document.addEventListener('visibilitychange', () => {
  if (!loop) return;
  if (document.hidden) loop.stop();
  else if (currentUser) loop.start();
});
window.addEventListener('pagehide', stopWorld);
