import { GameLoop } from './core/GameLoop.js';
import { createGameState, setGameStatus, GAME_STATUS, advanceGameState } from './core/GameState.js';
import { createWorldState } from './world/WorldState.js';
import { OceanRenderer } from './rendering/OceanRenderer.js';
import { renderLogin, renderPortal, renderLoading, renderConfigurationRequired } from './ui/Portal.js';

const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app ausente');

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
  renderPortal(root, currentUser, {
    onPlay: () => {
      if (!currentUser) return;
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
  if (!currentUser) return;
  stopWorld();
  const canvas = document.createElement('canvas');
  canvas.id = 'ocean';
  canvas.setAttribute('aria-label', 'Oceano da Região 1');
  root.replaceChildren(canvas);
  const world = createWorldState();
  const renderer = new OceanRenderer(canvas);
  let state = setGameStatus(createGameState(), GAME_STATUS.RUNNING);
  loop = new GameLoop({
    update: (stepMs) => { state = advanceGameState(state, stepMs); },
    render: () => renderer.render(world),
  });
  if (!document.hidden) loop.start();
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
